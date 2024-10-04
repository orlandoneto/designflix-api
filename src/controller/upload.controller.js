const multer = require("multer");
const Upload = require("../services/upload.service");
const AuthenticateRoute = require("../middleware/authentication");
const multerImagesConfig = require("../config/multer");
const multerCoverConfig = require("../config/multerCover");
const multerPackImagesConfig = require("../config/multerPackImagem");
const multerPackCoverConfig = require("../config/multerPackCover");

module.exports = (app) => {
  const UploadService = new Upload();

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
};
