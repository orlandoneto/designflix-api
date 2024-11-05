const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

class DownloadS3 {
  async getSignedUrlS3(req, res) {
    const key = req.query.key;
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
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
