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
const removeAvatarFromS3 = require("../middleware/removeAvatarFromS3");

module.exports = (app) => {
  const UploadService = new Upload();

  app.post(
    "/upload/thumb",
    uploadThumb,
    addWatermarkSoft,
    (req, res) => UploadService.file(req, res)
  );

  app.post(
    "/upload/preview",
    uploadPreview,
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
    removeAvatarFromS3,
    multer(multerPackAvatarConfig()).single("file"),
    (req, res) => {
      UploadService.file(req, res);
    }
  );
};
