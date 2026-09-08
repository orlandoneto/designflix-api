const { ok, badRequest, notFound, serverError } = require("../utils/httpResponse");
const {
  getDailyDownloadQuota,
} = require("./download/daily-download-limit");

module.exports = class {
  /** Quota do usuário autenticado (JWT). */
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
};
