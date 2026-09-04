const multer = require("multer");
const Upload = require("../services/upload.service");
const multerAvatarConfig = require("../config/multeAvatar");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require("crypto");
const EnvironmentPaths = require("../utils/environmentPaths");
const AuthenticateRoute = require("../middleware/authentication");
const { badRequest, serverError } = require("../utils/httpResponse");
const {
  createObjectStorageClient,
  putObjectParams,
  buildPublicObjectUrl,
} = require("../utils/objectStorage");

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
        return UploadService.file(req, res);
      } catch (e) {
        console.error("[upload/avatar/site]", e.message);
        return serverError(res, "Erro ao enviar o avatar");
      }
    }
  );
};
