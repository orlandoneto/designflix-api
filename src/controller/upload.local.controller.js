const multer = require("multer");
const Upload = require("../services/upload.service");
const multerAvatarConfig = require("../config/multeAvatar.local");
const crypto = require("crypto");
const EnvironmentPaths = require("../utils/environmentPaths");
const LocalObjectStore = require("../utils/localObjectStore");

/**
 * Cópia do upload de avatar para STORAGE_TYPE=local.
 * O upload.controller.js (S3) permanece o canônico de produção.
 */
module.exports = (app) => {
  const UploadService = new Upload();

  app.post(
    "/upload/avatar/site",
    (req, res, next) =>
      multer(multerAvatarConfig()).single("file")(req, res, (err) => {
        if (err) {
          const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
          return res.status(status).send({ status: "error", message: err.message });
        }
        next();
      }),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).send({ status: "error", message: "Nenhum arquivo enviado" });
        }
        const profilePath = EnvironmentPaths.getProfilePath();
        const rand = crypto.randomBytes(12).toString("hex");
        const fileName = `${profilePath}/${Date.now()}-${rand}-${req.file.originalname}`;
        const { url } = await LocalObjectStore.putObject({
          key: fileName,
          body: req.file.buffer,
          contentType: req.file.mimetype,
        });
        req.file.location = url;
        UploadService.file(req, res);
      } catch (e) {
        res.status(500).send({ status: "error", message: e.message });
      }
    }
  );
};
