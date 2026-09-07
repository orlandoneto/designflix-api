const { PlansDownloadLimits, User } = require("../models");
const { ok, badRequest, notFound, serverError } = require("../utils/httpResponse");
const {
  getDailyDownloadQuota,
} = require("./download/daily-download-limit");

module.exports = class {
  async create(req, res) {
    try {
      const { userId, currentCountDownloads } = req.body;
      const newLimit = await PlansDownloadLimits.create({
        user_id: userId,
        current_count_downloads: currentCountDownloads,
      });

      return ok(res, {
        message: "Limite de downloads criado",
        data: newLimit,
      });
    } catch (error) {
      console.error("Erro ao criar limite de downloads:", error);
      return serverError(res, "Erro ao criar limite de downloads");
    }
  }

  async getAll(req, res) {
    try {
      const limits = await PlansDownloadLimits.findAll({
        include: [{ model: User, as: "user", attributes: ["id", "name"] }],
      });
      return ok(res, {
        message: "Limites de downloads listados",
        data: limits,
      });
    } catch (error) {
      console.error("Erro ao buscar limites de downloads:", error);
      return serverError(res, "Erro ao buscar limites de downloads");
    }
  }

  /** Quota do usuário autenticado (JWT) — preferir este. */
  async getMyQuota(req, res) {
    try {
      const result = await getDailyDownloadQuota(req.params.userId);
      if (!result.ok) {
        if (result.status === 404) return notFound(res, result.message);
        return badRequest(res, result.message);
      }
      return ok(res, {
        message: "Quota de downloads diários",
        data: result.data,
      });
    } catch (error) {
      console.error("Erro ao buscar quota diária:", error);
      return serverError(res, "Erro ao buscar quota de downloads");
    }
  }

  async findByUserId(req, res) {
    const { user_id } = req.params;
    const authUserId = Number(req.params.userId);

    try {
      if (Number(user_id) !== authUserId) {
        return badRequest(res, "Só é permitido consultar a própria quota");
      }

      const limit = await PlansDownloadLimits.findOne({
        where: { user_id },
      });

      if (!limit) {
        return ok(res, {
          message: "Sem contador diário",
          data: { updatedAt: null, current_count_downloads: 0 },
        });
      }

      return ok(res, {
        message: "Limite de downloads encontrado",
        data: limit,
      });
    } catch (error) {
      console.error(
        "Erro ao buscar limite de downloads pelo ID do usuário:",
        error
      );
      return serverError(res, "Erro ao buscar limite de downloads");
    }
  }

  async update(req, res) {
    const { user_id } = req.params;
    const authUserId = Number(req.params.userId);

    try {
      if (Number(user_id) !== authUserId) {
        return badRequest(res, "Só é permitido atualizar a própria quota");
      }

      // Incremento legado — o caminho canônico é GET /signed/url (consome no back).
      let limit = await PlansDownloadLimits.findOne({
        where: { user_id },
      });

      if (limit) {
        limit = await limit.update({
          current_count_downloads: limit.current_count_downloads + 1,
          updatedAt: new Date(),
        });
      } else {
        limit = await PlansDownloadLimits.create({
          user_id,
          current_count_downloads: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return ok(res, {
        message: "Limite de downloads atualizado",
        data: limit,
      });
    } catch (error) {
      console.error("Erro ao atualizar limite de downloads:", error);
      return serverError(res, "Erro ao atualizar limite de downloads");
    }
  }

  async delete(req, res) {
    const { user_id } = req.params;
    const authUserId = Number(req.params.userId);

    try {
      if (Number(user_id) !== authUserId) {
        return badRequest(res, "Só é permitido resetar a própria quota");
      }

      const limit = await PlansDownloadLimits.findOne({
        where: { user_id },
      });

      if (!limit) {
        return ok(res, {
          message: "Sem contador diário",
          data: { updatedAt: null, current_count_downloads: 0 },
        });
      }

      await limit.destroy();
      return ok(res, {
        message: "Limite de downloads excluído com sucesso",
      });
    } catch (error) {
      console.error("Erro ao excluir limite de downloads:", error);
      return serverError(res, "Erro ao excluir limite de downloads");
    }
  }
};
