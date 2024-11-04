const multer = require("multer");
const Upload = require("../services/upload.service");
const multerImagesConfig = require("../config/multer");
const multerCoverConfig = require("../config/multerCover");
const multerPackImagesConfig = require("../config/multerPackImagem");
const multerPackCoverConfig = require("../config/multerPackCover");
const multerPackAvatarConfig = require("../config/multerPackAvatar");
const path = require("path");

module.exports = (app) => {
  const UploadService = new Upload();

  const foldAvatar = process.env.FOLDER_NAME_PACK_IMAGES_PATH;

  // FIXME: 1 - Fazer refactor para um unico arquivo de muilter
  // 2 - Usar middleware de autenticação
  app.post(
    "/upload/file",
    multer(multerImagesConfig).single("file"),
    (req, res) => UploadService.file(req, res)
  );

  app.post(
    "/upload/cover",
    multer(multerCoverConfig).single("file"),
    (req, res) => UploadService.file(req, res)
  );

  app.post(
    "/upload/pack/image",
    multer(multerPackImagesConfig).single("file"),
    (req, res) => UploadService.file(req, res)
  );

  app.post(
    "/upload/pack/cover",
    multer(multerPackCoverConfig).single("file"),
    (req, res) => UploadService.file(req, res)
  );

  app.post(
    "/upload/avatar/site",
    multer(multerPackAvatarConfig(foldAvatar)).single("file"),
    (req, res) => {
      UploadService.file(req, res);
    }
  );
};
