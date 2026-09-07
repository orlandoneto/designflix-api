const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const {
  createObjectStorageClient,
  getBucketName,
} = require("../utils/objectStorage");
const { ok, badRequest, notFound, serverError } = require("../utils/httpResponse");
const {
  assertAndConsumeDailyDownload,
} = require("./download/daily-download-limit");

class DownloadS3 {
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
      const s3Client = createObjectStorageClient();
      const command = new GetObjectCommand({
        Bucket: getBucketName(),
        Key: key,
      });

      const signedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 3600,
      });
      return ok(res, {
        message: "URL gerada com sucesso",
        data: { url: signedUrl, quota: quota.data },
      });
    } catch (error) {
      console.error("Erro ao gerar URL pré-assinada:", error);
      return serverError(res, "Erro ao gerar URL pré-assinada");
    }
  }
}

module.exports = new DownloadS3();
