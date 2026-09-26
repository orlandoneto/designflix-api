const { User, ContributorApplication } = require("../models");
const { sendEmail } = require("../utils/emailService");
const { ok, badRequest, notFound, serverError } = require("../utils/httpResponse");
const {
  validateApplicationBody,
  pickProfilePatch,
  mapAccount,
  mapApplication,
  isActiveContributor,
  TERMS_VERSION,
} = require("./contributor/contributor-rules");

const MODERATOR_EMAILS = (
  process.env.CONTRIBUTOR_MODERATOR_EMAILS ||
  "orlandoneto23@gmail.com,arlinofilho@gmail.com,designflixs3@gmail.com"
)
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

async function latestApplication(userId) {
  return ContributorApplication.findOne({
    where: { userId },
    order: [["createdAt", "DESC"]],
  });
}

async function pendingApplication(userId) {
  return ContributorApplication.findOne({
    where: { userId, status: "pending" },
    order: [["createdAt", "DESC"]],
  });
}

function notifyApply(user, application) {
  const paramsEmail = {
    email: user.email,
    name: user.name,
    title: "Solicitação de Contribuidor - ON Graph",
    description: "Recebemos sua solicitação para ser um contribuidor!",
  };
  const contextParams = {
    name: user.name,
    requestDate: new Date().toLocaleDateString("pt-BR"),
    baseUrl: process.env.API_URL,
  };
  sendEmail(paramsEmail, "contributorRequest", contextParams).catch((error) => {
    console.error("Erro ao enviar email de solicitação de contribuidor:", error);
  });
  MODERATOR_EMAILS.forEach((modEmail) => {
    sendEmail(
      {
        email: modEmail,
        name: user.name,
        title: "Nova Solicitação de Contribuidor - ON Graph",
        description: `O usuário ${user.name} (${user.email}) solicitou ser contribuidor.`,
      },
      "contributorRequestAdmin",
      { ...contextParams, email: user.email, portfolioUrl: application.portfolioUrl }
    ).catch((error) => {
      console.error("Erro ao enviar email para moderador:", modEmail, error);
    });
  });
}

class ContributorService {
  async getMe(req, res) {
    try {
      const userId = req.params.userId;
      const user = await User.findByPk(userId);
      if (!user) {
        return notFound(res, "Usuário não encontrado");
      }
      const application = await latestApplication(userId);
      return ok(res, {
        message: "Conta carregada",
        data: mapAccount(user, application),
      });
    } catch (err) {
      console.error("[contributor/getMe]", err);
      return serverError(res, "Erro ao carregar a conta");
    }
  }

  async updateMe(req, res) {
    try {
      const userId = req.params.userId;
      const user = await User.findByPk(userId);
      if (!user) {
        return notFound(res, "Usuário não encontrado");
      }

      const { patch, forbidden } = pickProfilePatch(req.body);
      if (!Object.keys(patch).length) {
        return badRequest(
          res,
          forbidden.length
            ? "Campos não permitidos neste endpoint. Use POST /contributor/applications para o programa de colaborador."
            : "Nenhum campo válido para atualizar"
        );
      }

      if (patch.username) {
        const taken = await User.findOne({ where: { username: patch.username } });
        if (taken && Number(taken.id) !== Number(userId)) {
          return badRequest(res, "Este nome de usuário já está em uso");
        }
      }

      await User.update(patch, { where: { id: userId } });
      const fresh = await User.findByPk(userId);
      const application = await latestApplication(userId);
      return ok(res, {
        message: "Atualização concluída!",
        data: mapAccount(fresh, application),
      });
    } catch (err) {
      console.error("[contributor/updateMe]", err);
      return serverError(res, "Erro ao atualizar a conta");
    }
  }

  async apply(req, res) {
    try {
      const userId = req.params.userId;
      const user = await User.findByPk(userId);
      if (!user) {
        return notFound(res, "Usuário não encontrado");
      }
      if (isActiveContributor(user)) {
        return badRequest(res, "Você já é colaborador");
      }

      const pending = await pendingApplication(userId);
      if (pending) {
        return badRequest(res, "Você já tem uma solicitação em análise");
      }

      const parsed = validateApplicationBody(req.body);
      if (!parsed.ok) {
        return badRequest(res, parsed.message);
      }

      const created = await ContributorApplication.create({
        userId: Number(userId),
        portfolioUrl: parsed.data.portfolioUrl,
        instagram: parsed.data.instagram,
        behance: parsed.data.behance,
        about: parsed.data.about,
        status: "pending",
        termsVersion: parsed.data.termsVersion || TERMS_VERSION,
        termsAcceptedAt: new Date(),
      });

      await User.update(
        { contributorStatus: "pending", contributor: 0 },
        { where: { id: userId } }
      );

      notifyApply(user, created);

      const fresh = await User.findByPk(userId);
      return ok(res, {
        message: "Solicitação enviada",
        data: mapAccount(fresh, created),
      });
    } catch (err) {
      console.error("[contributor/apply]", err);
      return serverError(res, "Erro ao enviar a solicitação");
    }
  }

  async getMine(req, res) {
    try {
      const userId = req.params.userId;
      const application = await latestApplication(userId);
      return ok(res, {
        message: application ? "Solicitação encontrada" : "Nenhuma solicitação",
        data: mapApplication(application),
      });
    } catch (err) {
      console.error("[contributor/getMine]", err);
      return serverError(res, "Erro ao carregar a solicitação");
    }
  }

  async listAdmin(req, res) {
    try {
      const status = String(req.query.status || "pending").trim();
      const rows = await ContributorApplication.findAll({
        where: { status },
        order: [["createdAt", "ASC"]],
        include: [{ model: User, attributes: { exclude: ["password"] } }],
      });
      return ok(res, {
        message: "Solicitações listadas",
        data: rows.map((row) => ({
          ...mapApplication(row),
          user: row.User
            ? {
                id: row.User.id,
                name: row.User.name,
                email: row.User.email,
              }
            : null,
        })),
      });
    } catch (err) {
      console.error("[contributor/listAdmin]", err);
      return serverError(res, "Erro ao listar solicitações");
    }
  }

  async approve(req, res) {
    try {
      const id = req.params.id;
      const adminId = req.params.adminId || null;
      const row = await ContributorApplication.findByPk(id);
      if (!row) {
        return notFound(res, "Solicitação não encontrada");
      }
      if (row.status !== "pending") {
        return badRequest(res, "Esta solicitação não está pendente");
      }

      await row.update({
        status: "approved",
        reviewedAt: new Date(),
        reviewedBy: adminId ? Number(adminId) : null,
        reviewNote: req.body?.note || null,
      });
      await User.update(
        { contributor: 1, contributorStatus: "active" },
        { where: { id: row.userId } }
      );

      const user = await User.findByPk(row.userId);
      return ok(res, {
        message: "Colaborador aprovado",
        data: mapAccount(user, row),
      });
    } catch (err) {
      console.error("[contributor/approve]", err);
      return serverError(res, "Erro ao aprovar solicitação");
    }
  }

  async reject(req, res) {
    try {
      const id = req.params.id;
      const adminId = req.params.adminId || null;
      const row = await ContributorApplication.findByPk(id);
      if (!row) {
        return notFound(res, "Solicitação não encontrada");
      }
      if (row.status !== "pending") {
        return badRequest(res, "Esta solicitação não está pendente");
      }

      await row.update({
        status: "rejected",
        reviewedAt: new Date(),
        reviewedBy: adminId ? Number(adminId) : null,
        reviewNote: req.body?.note || null,
      });
      await User.update(
        { contributor: 0, contributorStatus: "rejected" },
        { where: { id: row.userId } }
      );

      const user = await User.findByPk(row.userId);
      return ok(res, {
        message: "Solicitação recusada",
        data: mapAccount(user, row),
      });
    } catch (err) {
      console.error("[contributor/reject]", err);
      return serverError(res, "Erro ao recusar solicitação");
    }
  }
}

module.exports = new ContributorService();
