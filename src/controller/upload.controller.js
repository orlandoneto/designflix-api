const multer = require("multer");
const Upload = require("../services/upload.service");
const AuthenticateRoute = require("../middleware/authentication");
const multerImagesConfig = require("../config/multer");
const multerCoverConfig = require("../config/multerCover");

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
};
