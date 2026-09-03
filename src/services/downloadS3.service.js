const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const {
  createObjectStorageClient,
  getBucketName,
} = require("../utils/objectStorage");

class DownloadS3 {
  async getSignedUrlS3(req, res) {
    const key = req.query.key;
    try {
      const s3Client = createObjectStorageClient();
      const command = new GetObjectCommand({
        Bucket: getBucketName(),
        Key: key,
      });

      const signedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 3600,
      });
      res
        .status(200)
        .send({ data: { url: signedUrl }, message: "URL gerada com sucesso" });
    } catch (error) {
      console.error("Erro ao gerar URL pré-assinada:", error);
      res
        .status(500)
        .send({ message: "Erro ao gerar URL pré-assinada", error });
    }
  }
}

module.exports = new DownloadS3();
