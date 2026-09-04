const multer = require("multer");
const Upload = require("../services/upload.service");
const multerAvatarConfig = require("../config/multeAvatar.local");
const crypto = require("crypto");
const EnvironmentPaths = require("../utils/environmentPaths");
const LocalObjectStore = require("../utils/localObjectStore");
const AuthenticateRoute = require("../middleware/authentication");
const { badRequest, serverError } = require("../utils/httpResponse");

/**
 * Cópia do upload de avatar para STORAGE_TYPE=local.
 * O upload.controller.js (S3/R2) permanece o canônico de produção.
 */
module.exports = (app) => {
  const UploadService = new Upload();

  app.post(
    "/upload/avatar/site",
    AuthenticateRoute(["user"]),
    (req, res, next) =>
      multer(multerAvatarConfig()).single("file")(req, res, (err) => {
        if (err) {
          const message =
            err.code === "LIMIT_FILE_SIZE"
              ? "Arquivo muito grande"
              : err.message || "Arquivo inválido";
          return badRequest(res, message);
        }
        next();
      }),
    async (req, res) => {
      try {
        if (!req.file) {
          return badRequest(res, "Nenhum arquivo enviado");
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
        return UploadService.file(req, res);
      } catch (e) {
        console.error("[upload/avatar/site local]", e.message);
        return serverError(res, "Erro ao enviar o avatar");
      }
    }
  );
};
