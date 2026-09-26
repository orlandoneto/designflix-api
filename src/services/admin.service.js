const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");

const { Admin } = require("../models");
const { sendEmail } = require("../utils/emailService");
const { getAdminPanelUrl } = require("../utils/mailTransport");
const { ok, badRequest, serverError } = require("../utils/httpResponse");
const { getJwtPrivateKey, JWT_ALGORITHM } = require("../utils/jwtKeys");

/** Validade do link de redefinição de senha do admin. */
const RESET_TOKEN_TTL_MINUTES = 30;
/** Intervalo mínimo entre pedidos para a mesma conta (anti-spam de e-mail; vale entre workers). */
const RESET_REQUEST_COOLDOWN_SECONDS = 60;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

const RESET_REQUEST_OK_MESSAGE =
  "Se o e-mail estiver cadastrado como administrador, você receberá um link para redefinir a senha.";
const INVALID_RESET_TOKEN_MESSAGE =
  "Link inválido ou expirado. Solicite uma nova redefinição de senha.";
const INVALID_CREDENTIALS_MESSAGE = "E-mail ou senha incorretos";

/** Campos que nunca saem em resposta nem entram no JWT. */
const SENSITIVE_FIELDS = [
  "password",
  "resetTokenHash",
  "resetTokenExpiresAt",
  "resetRequestedAt",
  "reset_token_hash",
  "reset_token_expires_at",
  "reset_requested_at",
];

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function generateResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashResetToken(token) {
  return crypto.createHash("sha256").update(String(token), "utf8").digest("hex");
}

function isResetTokenFormat(token) {
  return typeof token === "string" && /^[a-f0-9]{64}$/.test(token);
}

function sanitizeAdmin(admin) {
  if (!admin) return admin;
  const data = { ...(admin.dataValues || admin) };
  for (const field of SENSITIVE_FIELDS) delete data[field];
  return data;
}

function maskEmail(email) {
  const [user, domain] = String(email || "").split("@");
  if (!domain) return "";
  const visible = user.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(user.length - visible.length, 1))}@${domain}`;
}

function validateNewPassword(password, confirmPassword) {
  if (!password || !confirmPassword) {
    return "Senha e confirmação são obrigatórias";
  }
  if (typeof password !== "string" || typeof confirmPassword !== "string") {
    return "Senha inválida";
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres`;
  }
  if (password !== confirmPassword) {
    return "Senha e confirmação não coincidem";
  }
  return null;
}

class AdminService {
  async get(req, res) {
    const admin = await Admin.findOne({
      where: { id: req.params.adminId },
      attributes: { exclude: SENSITIVE_FIELDS.filter((f) => !f.includes("_")) },
    });

    res.status(200).send({ data: sanitizeAdmin(admin) });
  }

  async getByEmail(email) {
    const admin = await Admin.findOne({
      where: { email },
    });

    return admin;
  }

  /** `POST /admin` — só super_admin (AuthenticateRoute na rota). */
  async create(req, res) {
    try {
      const email = normalizeEmail(req.body?.email);
      const name = String(req.body?.name || "").trim();
      const password = req.body?.password;

      if (!email || !name || !password) {
        return badRequest(res, "Nome, e-mail e senha são obrigatórios");
      }
      if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
        return badRequest(
          res,
          `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres`
        );
      }

      const hasAdminEmail = await this.getByEmail(email);
      if (hasAdminEmail) {
        return badRequest(res, "Já existe um usuário com o e-mail informado");
      }

      // super_admin nunca vem do body: conta nova é sempre admin comum.
      const admin = await Admin.create({ email, password, name });

      return ok(res, {
        message: "Administrador criado com sucesso",
        data: sanitizeAdmin(admin),
      });
    } catch (err) {
      console.error("[admin] create:", err.message);
      return serverError(res, "Erro ao criar administrador");
    }
  }

  async authenticate(req, res) {
    try {
      const email = normalizeEmail(req.body?.email);
      const password = req.body?.password;

      if (!email || !password || typeof password !== "string") {
        res.status(401).send({ message: INVALID_CREDENTIALS_MESSAGE });
        return;
      }

      const admin = await this.getByEmail(email);

      // Mesma mensagem para e-mail inexistente e senha errada (sem enumeração).
      if (!admin) {
        res.status(401).send({ message: INVALID_CREDENTIALS_MESSAGE });
        return;
      }

      const validatePassword = await bcrypt.compare(password, admin.password);

      if (!validatePassword) {
        res.status(401).send({ message: INVALID_CREDENTIALS_MESSAGE });
        return;
      }

      const adminData = sanitizeAdmin(admin);
      adminData.userType = adminData.super_admin ? "super_admin" : "admin";

      const token = jwt.sign(adminData, getJwtPrivateKey(), {
        algorithm: JWT_ALGORITHM,
        expiresIn: 60 * 60 * 24 * 7 * 2,
      });

      res.status(200).send({ data: adminData, token });
      return;
    } catch (err) {
      console.error("[admin] authenticate:", err.message);
      res.status(500).send({ message: "Erro interno do servidor" });
    }
  }

  /**
   * `POST /admin/reset-password` — pede o link. Resposta sempre igual (200),
   * exista ou não o e-mail. Token de uso único: só o hash fica no banco.
   */
  async requestPasswordReset(req, res) {
    const email = normalizeEmail(req.body?.email);
    if (!email) {
      return badRequest(res, "E-mail é obrigatório");
    }

    try {
      const admin = await this.getByEmail(email);

      if (admin && !this.isInResetCooldown(admin)) {
        const token = generateResetToken();
        const now = new Date();

        await Admin.update(
          {
            resetTokenHash: hashResetToken(token),
            resetTokenExpiresAt: new Date(
              now.getTime() + RESET_TOKEN_TTL_MINUTES * 60 * 1000
            ),
            resetRequestedAt: now,
          },
          { where: { id: admin.id } }
        );

        // Envio fora do caminho da resposta: tempo de resposta não revela se o e-mail existe.
        this.pendingDelivery = this.sendResetEmail(admin, token).catch((err) => {
          console.error("[admin-reset] falha ao enviar e-mail:", err.message);
        });
      }

      return ok(res, { message: RESET_REQUEST_OK_MESSAGE });
    } catch (err) {
      console.error("[admin-reset] request:", err.message);
      return serverError(res, "Erro ao processar a solicitação");
    }
  }

  isInResetCooldown(admin, now = new Date()) {
    if (!admin?.resetRequestedAt) return false;
    const last = new Date(admin.resetRequestedAt).getTime();
    return now.getTime() - last < RESET_REQUEST_COOLDOWN_SECONDS * 1000;
  }

  async sendResetEmail(admin, token) {
    const resetLink = `${getAdminPanelUrl()}/reset-password?token=${token}`;
    const expiresInLabel = `${RESET_TOKEN_TTL_MINUTES} minutos`;

    return sendEmail(
      {
        email: admin.email,
        title: "Redefinição de senha — Admin ON Graph",
        description: `Redefina sua senha de administrador (válido por ${expiresInLabel}): ${resetLink}`,
      },
      "adminResetPassword",
      {
        name: admin.name,
        resetLink,
        expiresInLabel,
        baseUrl: process.env.API_URL,
        year: new Date().getFullYear(),
      }
    );
  }

  async findAdminByResetToken(token) {
    if (!isResetTokenFormat(token)) return null;

    return Admin.findOne({
      where: {
        resetTokenHash: hashResetToken(token),
        resetTokenExpiresAt: { [Op.gt]: new Date() },
      },
    });
  }

  /** `POST /admin/reset-password/validate` — a tela confere o link antes do formulário. */
  async validateResetToken(req, res) {
    try {
      const admin = await this.findAdminByResetToken(req.body?.token);
      if (!admin) {
        return badRequest(res, INVALID_RESET_TOKEN_MESSAGE);
      }

      return ok(res, {
        message: "Link válido",
        data: { valid: true, email: maskEmail(admin.email) },
      });
    } catch (err) {
      console.error("[admin-reset] validate:", err.message);
      return serverError(res, "Erro ao validar o link");
    }
  }

  /** `POST /admin/reset-password/confirm` — troca a senha e invalida o token. */
  async confirmPasswordReset(req, res) {
    const { token, password, confirmPassword } = req.body || {};

    if (!token) {
      return badRequest(res, INVALID_RESET_TOKEN_MESSAGE);
    }

    const passwordError = validateNewPassword(password, confirmPassword);
    if (passwordError) {
      return badRequest(res, passwordError);
    }

    try {
      const admin = await this.findAdminByResetToken(token);
      if (!admin) {
        return badRequest(res, INVALID_RESET_TOKEN_MESSAGE);
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      // Update condicionado ao hash: dois cliques simultâneos não usam o mesmo token.
      // (update estático não dispara o hook beforeUpdate, por isso o hash é feito aqui.)
      const [affected] = await Admin.update(
        {
          password: hashedPassword,
          isResetPassword: 0,
          resetTokenHash: null,
          resetTokenExpiresAt: null,
          resetRequestedAt: null,
        },
        { where: { id: admin.id, resetTokenHash: hashResetToken(token) } }
      );

      if (!affected) {
        return badRequest(res, INVALID_RESET_TOKEN_MESSAGE);
      }

      return ok(res, {
        message: "Senha redefinida com sucesso. Entre com a nova senha.",
      });
    } catch (err) {
      console.error("[admin-reset] confirm:", err.message);
      return serverError(res, "Erro ao redefinir a senha");
    }
  }

  async update(req, res) {
    const where = { id: req.params.adminId };

    const oldAdmin = await Admin.findOne({ where });

    const updatedAdmin = { ...req.body, ...oldAdmin };
    for (const field of SENSITIVE_FIELDS) {
      if (field !== "password") delete updatedAdmin[field];
    }

    if (req.body.password) {
      updatedAdmin.password = await bcrypt.hashSync(
        req.body.password,
        bcrypt.genSaltSync(10)
      );
    }

    await Admin.update(updatedAdmin, { where });

    const admin = await Admin.findOne({ where });

    res.status(200).send({ data: sanitizeAdmin(admin) });
  }
}

module.exports = AdminService;
module.exports.RESET_TOKEN_TTL_MINUTES = RESET_TOKEN_TTL_MINUTES;
module.exports.RESET_REQUEST_COOLDOWN_SECONDS = RESET_REQUEST_COOLDOWN_SECONDS;
module.exports.RESET_REQUEST_OK_MESSAGE = RESET_REQUEST_OK_MESSAGE;
module.exports.INVALID_RESET_TOKEN_MESSAGE = INVALID_RESET_TOKEN_MESSAGE;
module.exports.hashResetToken = hashResetToken;
module.exports.sanitizeAdmin = sanitizeAdmin;
module.exports.maskEmail = maskEmail;
