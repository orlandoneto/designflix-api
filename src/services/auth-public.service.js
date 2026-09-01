/**
 * Serviços HTTP do fluxo público de autenticação:
 * login, cadastro, OTP e recuperação de senha.
 */
const bcrypt = require("bcrypt");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const { User, Otps, Partners, UserPartners, sequelize } = require("../models");
const { sendEmail } = require("../utils/emailService");
const { getForgotRedirectUrl } = require("../utils/mailTransport");
const { ok, badRequest, serverError } = require("../utils/authHttpResponse");
const userService = require("./user.service");

const privateKey = fs.readFileSync(
  path.join(__dirname, "../middleware/private.key")
);

const RESET_TOKEN_EXPIRES_IN = "15m";
const RESET_TOKEN_EXPIRES_LABEL = "15 minutos";
const FORGOT_PASSWORD_OK_MESSAGE =
  "Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function simplifyUserData(user) {
  return userService.simplifyUserData(user);
}

function signUserToken(userData) {
  return jwt.sign(userData, privateKey, {
    algorithm: "RS256",
    expiresIn: 60 * 60 * 24 * 7 * 2,
  });
}

function signResetToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, privateKey, {
    algorithm: "RS256",
    expiresIn: RESET_TOKEN_EXPIRES_IN,
  });
}

function generateOtp() {
  const randomstring = require("randomstring");
  return randomstring.generate({ length: 6, charset: "numeric" });
}

module.exports = class AuthPublicService {
  async authenticate(req, res) {
    try {
      const email = normalizeEmail(req.body?.email);
      const password = req.body?.password;

      if (!email || !password) {
        return badRequest(res, "E-mail e senha são obrigatórios");
      }

      const user = await User.findOne({ where: { email } });
      if (!user) {
        return badRequest(res, "E-mail ou senha incorretos");
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return badRequest(res, "E-mail ou senha incorretos");
      }

      const userData = simplifyUserData(user);
      userData.userType = "user";
      const token = signUserToken(userData);

      return ok(res, {
        message: "Login realizado com sucesso",
        data: { user: userData, token },
      });
    } catch (error) {
      console.error("authenticate:", error.message);
      return serverError(res, "Erro ao autenticar usuário");
    }
  }

  async getUserByEmail(req, res) {
    try {
      const email = normalizeEmail(req.params.email);
      if (!email) {
        return badRequest(res, "E-mail é obrigatório");
      }

      const user = await User.findOne({ where: { email } });
      if (!user) {
        return ok(res, {
          message: "Usuário não encontrado",
          data: { exists: false },
        });
      }

      return ok(res, {
        message: "Usuário encontrado",
        data: { exists: true },
      });
    } catch (error) {
      console.error("getUserByEmail:", error.message);
      return serverError(res, "Erro ao verificar e-mail");
    }
  }

  async register(req, res) {
    try {
      let {
        fullName,
        email,
        password,
        phone,
        countryCode,
        code_partner,
        acceptTerms,
        privacyPolicy,
      } = req.body || {};

      email = normalizeEmail(email);
      fullName = String(fullName || "").trim();
      phone = phone ? String(phone).replace(/\D/g, "") : null;
      countryCode = phone ? Number(countryCode) || 55 : null;

      if (!fullName || !email || !password) {
        return badRequest(res, "Nome, e-mail e senha são obrigatórios");
      }

      if (!acceptTerms && acceptTerms !== 1 && acceptTerms !== true) {
        return badRequest(res, "É necessário aceitar os termos de uso");
      }

      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return badRequest(res, "Já existe um usuário com o e-mail informado");
      }

      if (typeof password === "undefined") {
        const trimmedPhone = String(phone || "").replace(/\D/g, "");
        password = uuidv4() + trimmedPhone;
      }

      const transaction = await sequelize.transaction();
      let user;

      try {
        let partnerId = null;
        if (code_partner && String(code_partner).trim() !== "") {
          const partner = await Partners.findOne({
            where: {
              code: String(code_partner).trim().toUpperCase(),
              active: 1,
            },
            attributes: ["id", "name", "code"],
          });

          if (!partner) {
            await transaction.rollback();
            return badRequest(res, "Código do parceiro inválido");
          }

          partnerId = partner.id;
        }

        user = await User.create(
          {
            name: fullName,
            email,
            password,
            phone,
            countryCode,
            status: "CACTIVE",
            partnerCode: code_partner
              ? String(code_partner).trim().toUpperCase()
              : null,
            acceptTerms: 1,
            privacyPolicy:
              privacyPolicy === 0 || privacyPolicy === false ? 0 : 1,
          },
          { transaction }
        );

        if (partnerId) {
          await UserPartners.create(
            {
              userId: user.id,
              partnerId,
              startPartner: new Date(),
              endPartner: null,
              active: 1,
            },
            { transaction }
          );
        }

        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }

      const userData = simplifyUserData(user);
      userData.userType = "user";
      const token = signUserToken(userData);
      const userPayload = { ...userData, token };

      const paramsEmail = {
        email,
        name: fullName,
        title: "FlixDesign - Conta criada",
        description: "Sua conta foi criada com sucesso!",
      };

      sendEmail(paramsEmail, "index", {
        name: fullName,
        time: "Sua conta está pronta. Faça login e explore a galeria.",
        baseUrl: process.env.API_URL || process.env.APP_URL,
      }).catch((error) => {
        console.error("Erro ao enviar email de boas-vindas:", error.message);
      });

      return ok(res, {
        message: "Conta criada com sucesso",
        data: { user: userPayload },
      });
    } catch (error) {
      console.error("register:", error.message);
      return serverError(res, "Erro ao criar conta");
    }
  }

  async sendOtp(req, res) {
    try {
      const email = normalizeEmail(req.query.email);
      if (!email) {
        return badRequest(res, "E-mail é obrigatório");
      }

      const otp = generateOtp();
      await Otps.destroy({ where: { email } });
      await Otps.create({ email, otp });

      const paramsEmail = {
        email,
        name: "FlixDesign",
        title: "FlixDesign - Código de Verificação",
        description: `Seu código é: ${otp}`,
      };

      try {
        await sendEmail(paramsEmail, "otps", {
          name: "usuário",
          otps: otp,
          baseUrl: process.env.API_URL || process.env.APP_URL,
        });
      } catch (emailError) {
        console.error("Erro ao enviar e-mail OTP:", emailError.message);

        if (process.env.NODE_ENV === "development") {
          console.log(`[DEV OTP] ${email} => ${otp}`);
          return ok(res, {
            message:
              "Código gerado (e-mail falhou em dev — use o código retornado)",
            data: { devOtp: otp, emailError: emailError.message },
          });
        }

        await Otps.destroy({ where: { email } });
        return serverError(res, "Não foi possível enviar o e-mail de verificação");
      }

      const payload = { message: "Código enviado com sucesso" };
      if (process.env.NODE_ENV === "development") {
        console.log(`[DEV OTP] ${email} => ${otp}`);
        payload.data = { devOtp: otp };
      }

      return ok(res, payload);
    } catch (error) {
      console.error("sendOtp:", error.message);
      return serverError(res, "Erro ao enviar código de verificação");
    }
  }

  async verifyOtp(req, res) {
    try {
      const email = normalizeEmail(req.query.email);
      const otp = String(req.query.otp || "").trim();

      if (!email || !otp) {
        return badRequest(res, "E-mail e código são obrigatórios");
      }

      const existingOTP = await Otps.findOne({ where: { email, otp } });
      if (!existingOTP) {
        return badRequest(res, "Código inválido ou expirado");
      }

      await Otps.destroy({ where: { email } });
      return ok(res, { message: "Código verificado com sucesso" });
    } catch (error) {
      console.error("verifyOtp:", error.message);
      return serverError(res, "Erro ao verificar código");
    }
  }

  async forgotPassword(req, res) {
    try {
      const email = normalizeEmail(req.body?.email);
      if (!email) {
        return badRequest(res, "E-mail é obrigatório");
      }

      const user = await User.findOne({ where: { email } });
      if (!user) {
        return ok(res, { message: FORGOT_PASSWORD_OK_MESSAGE });
      }

      const resetToken = signResetToken(user);
      const redirectUrl = getForgotRedirectUrl();
      const resetLink = `${redirectUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

      await sendEmail(
        {
          email: user.email,
          title: "Redefinição de senha — Flix Design",
          description: `Redefina sua senha: ${resetLink}`,
        },
        "forgot",
        {
          name: user.name,
          resetLink,
          baseUrl: process.env.API_URL,
          year: new Date().getFullYear(),
          expiresInLabel: RESET_TOKEN_EXPIRES_LABEL,
        }
      );

      return ok(res, { message: FORGOT_PASSWORD_OK_MESSAGE });
    } catch (error) {
      console.error("forgotPassword:", error.message);
      const devMailpitHint =
        process.env.NODE_ENV === "development" &&
        /mailpit|1025|ECONNREFUSED/i.test(error.message);

      return serverError(
        res,
        devMailpitHint
          ? "Mailpit indisponível. Na API rode: yarn mailpit:up (ou reinicie yarn dev)"
          : "Erro ao processar a solicitação"
      );
    }
  }

  async forgotCheckToken(req, res) {
    try {
      const token = req.params.token;
      if (!token) {
        return badRequest(res, "Token é obrigatório");
      }

      const decoded = jwt.verify(token, privateKey);
      const user = await User.findOne({
        where: { id: decoded.id },
        attributes: ["id", "email", "name"],
      });

      if (!user) {
        return badRequest(res, "Token inválido ou expirado");
      }

      return ok(res, {
        message: "Token válido",
        data: { valid: true, email: user.email, name: user.name },
      });
    } catch (error) {
      return badRequest(res, "Token inválido ou expirado. Solicite uma nova redefinição.");
    }
  }

  async forgotUpdatePassword(req, res) {
    try {
      const { token } = req.params;
      const { password, confirmPassword } = req.body || {};

      if (!token) {
        return badRequest(res, "Token é obrigatório");
      }

      if (!password || !confirmPassword) {
        return badRequest(res, "Senha e confirmação de senha são obrigatórias");
      }

      if (password !== confirmPassword) {
        return badRequest(res, "Senha e confirmação não coincidem");
      }

      if (password.length < 6) {
        return badRequest(res, "Senha deve ter pelo menos 6 caracteres");
      }

      const decoded = jwt.verify(token, privateKey);
      const user = await User.findOne({ where: { id: decoded.id } });
      if (!user) {
        return badRequest(res, "Token inválido ou expirado");
      }

      const isSamePassword = await bcrypt.compare(password, user.password);
      if (isSamePassword) {
        return badRequest(res, "A nova senha deve ser diferente da senha atual");
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await User.update(
        {
          password: hashedPassword,
          isResetPassword: 0,
          lastPasswordChange: new Date(),
        },
        { where: { id: user.id } }
      );

      return ok(res, {
        message: "Senha redefinida com sucesso. Faça login novamente.",
        data: { requiresReauth: true },
      });
    } catch (error) {
      if (
        error.name === "JsonWebTokenError" ||
        error.name === "TokenExpiredError"
      ) {
        return badRequest(res, "Token inválido ou expirado. Solicite uma nova redefinição");
      }

      console.error("forgotUpdatePassword:", error.message);
      return serverError(res, "Erro interno ao redefinir senha");
    }
  }
};
