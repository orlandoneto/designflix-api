const multer = require("multer");
const { CONST } = require("../utils/constants/constants");

/** Multer avatar para cópia local — não exige AWS */
module.exports = () => {
  return {
    storage: multer.memoryStorage(),
    limits: {
      fileSize: CONST.LIMIT_SIZE_IMG,
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = ["image/jpeg", "image/png", "image/gif"];
      const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif"];

      if (allowedMimes.includes(file.mimetype)) {
        return cb(null, true);
      }

      const path = require("path");
      const fileExtension = path.extname(file.originalname).toLowerCase();
      if (allowedExtensions.includes(fileExtension)) {
        return cb(null, true);
      }
      return cb(new Error("Invalid file type. Supported types: images and archives (ZIP, RAR, 7z)."));
    },
  };
};
