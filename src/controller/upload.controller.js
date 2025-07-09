const multer = require("multer");
const Upload = require("../services/upload.service");
const {
  uploadThumb,
  addWatermarkSoft,
} = require("../config/multerUploadThumb");
const {
  uploadPreview,
  addWatermarkFull,
} = require("../config/multerUploadPreview");
const multerUploadJPEG = require("../config/multerUploadJPEG");
const multerUploadZip = require("../config/multerUploadZip");
const multerPackAvatarConfig = require("../config/multerPackAvatar");
const path = require("path");
const { FOLDER_NAME_PACK_IMAGES_PATH } = require("../utils/constants/constants");

module.exports = (app) => {
  const UploadService = new Upload();

  const foldAvatar = FOLDER_NAME_PACK_IMAGES_PATH;

  app.post(
    "/upload/thumb",
    multer(uploadThumb).single("file"),
    addWatermarkSoft,
    (req, res) => UploadService.file(req, res)
  );

  app.post(
    "/upload/preview",
    multer(uploadPreview).single("file"),
    addWatermarkFull,
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
};
