const multer = require("multer");
const Upload = require("../services/upload.service");
const {
  uploadPreview,
  addWatermark,
} = require("../config/multerUploadPreview");
const multerUploadJPEG = require("../config/multerUploadJPEG");
const multerUploadZip = require("../config/multerUploadZip");
const multerPackImagesConfig = require("../config/multerPackImagem");
const multerPackCoverConfig = require("../config/multerPackCover");
const multerPackAvatarConfig = require("../config/multerPackAvatar");
const path = require("path");

module.exports = (app) => {
  const UploadService = new Upload();

  const foldAvatar = process.env.FOLDER_NAME_PACK_IMAGES_PATH;

  app.post(
    "/upload/preview",
    multer(uploadPreview).single("file"),
    addWatermark,
    (req, res) => UploadService.file(req, res)
  );

  app.post(
    "/upload/jpeg",
    multer(multerUploadJPEG).single("file"),
    (req, res) => UploadService.file(req, res)
  );

  app.post("/upload/zip", multer(multerUploadZip).single("file"), (req, res) =>
    UploadService.file(req, res)
  );

  app.post(
    "/upload/avatar/site",
    multer(multerPackAvatarConfig(foldAvatar)).single("file"),
    (req, res) => {
      UploadService.file(req, res);
    }
  );

  /* Checar uso */
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

  /* Checar uso */
};
