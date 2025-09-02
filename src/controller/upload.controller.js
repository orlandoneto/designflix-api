const multer = require("multer");
const Upload = require("../services/upload.service");
const multerAvatarConfig = require("../config/multeAvatar");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require("crypto");
const EnvironmentPaths = require("../utils/environmentPaths");

module.exports = (app) => {
  const UploadService = new Upload();
  const s3 = new S3Client({
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    defaultsMode: 'standard',
  });

  app.post(
    "/upload/avatar/site",
    (req, res, next) =>
      multer(multerAvatarConfig()).single("file")(req, res, (err) => {
        if (err) {
          const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
          return res.status(status).send({ status: "error", message: err.message });
        }
        next();
      }),
    async (req, res) => {
      try {
        if (!req.file) return res.status(400).send({ status: "error", message: "Nenhum arquivo enviado" });
        const profilePath = EnvironmentPaths.getProfilePath();
        const rand = crypto.randomBytes(12).toString("hex");
        const fileName = `${profilePath}/${Date.now()}-${rand}-${req.file.originalname}`;
        await s3.send(new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: fileName,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
          ACL: "public-read",
        }));
        req.file.location = `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${fileName}`;
        UploadService.file(req, res);
      } catch (e) {
        res.status(500).send({ status: "error", message: e.message });
      }
    }
  );
};
