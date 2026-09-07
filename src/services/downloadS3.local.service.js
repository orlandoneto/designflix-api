const LocalObjectStore = require("../utils/localObjectStore");
const { ok, badRequest, notFound, serverError } = require("../utils/httpResponse");
const {
  assertAndConsumeDailyDownload,
} = require("./download/daily-download-limit");

/**
 * Cópia local do download signed-URL (STORAGE_TYPE=local).
 * downloadS3.service.js (S3) permanece paralelo.
 */
class DownloadLocal {
  async getSignedUrlS3(req, res) {
    const key = req.query.key;
    if (!key || !String(key).trim()) {
      return badRequest(res, "Parâmetro key é obrigatório");
    }

    const userId = req.params.userId;
    const quota = await assertAndConsumeDailyDownload(userId);
    if (!quota.ok) {
      if (quota.status === 404) return notFound(res, quota.message);
      return badRequest(res, quota.message);
    }

    try {
      const url = LocalObjectStore.publicUrlForKey(
        String(key).replace(/^uploads\//, "")
      );
      return ok(res, {
        message: "URL gerada com sucesso",
        data: { url, quota: quota.data },
      });
    } catch (error) {
      console.error("Erro ao gerar URL local:", error);
      return serverError(res, "Erro ao gerar URL local");
    }
  }
}

module.exports = new DownloadLocal();
