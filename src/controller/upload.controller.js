const multer = require("multer");
const Upload = require("../services/upload.service");
const multerAvatarConfig = require("../config/multeAvatar");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require("crypto");
const EnvironmentPaths = require("../utils/environmentPaths");
const {
  createObjectStorageClient,
  putObjectParams,
  buildPublicObjectUrl,
} = require("../utils/objectStorage");

module.exports = (app) => {
  const UploadService = new Upload();

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
        const s3 = createObjectStorageClient();
        const profilePath = EnvironmentPaths.getProfilePath();
        const rand = crypto.randomBytes(12).toString("hex");
        const fileName = `${profilePath}/${Date.now()}-${rand}-${req.file.originalname}`;
        await s3.send(
          new PutObjectCommand(
            putObjectParams({
              Key: fileName,
              Body: req.file.buffer,
              ContentType: req.file.mimetype,
            })
          )
        );
        req.file.location = buildPublicObjectUrl(fileName);
        UploadService.file(req, res);
      } catch (e) {
        res.status(500).send({ status: "error", message: e.message });
      }
    }
  );
};
