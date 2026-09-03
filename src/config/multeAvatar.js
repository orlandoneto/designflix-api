const multer = require("multer");
const { CONST } = require("../utils/constants/constants");
const { assertObjectStorageConfigured } = require("../utils/objectStorage");

// Armazena em memória; o upload ao S3/R2 será feito no controller
const memoryStorage = multer.memoryStorage();

module.exports = () => {
  return {
    storage: memoryStorage,
    limits: {
      fileSize: CONST.LIMIT_SIZE_IMG,
    },
    fileFilter: (req, file, cb) => {
      try {
        assertObjectStorageConfigured();
      } catch (e) {
        return cb(new Error(e.message || "Object storage não configurado"));
      }

      const allowedMimes = [
        "image/jpeg",
        "image/png",
        "image/gif",
      ];

      const allowedExtensions = [
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
      ];

      // Verificar MIME type
      if (allowedMimes.includes(file.mimetype)) {
        return cb(null, true);
      }

      // Verificar extensão do arquivo
      const path = require("path");
      const fileExtension = path.extname(file.originalname).toLowerCase();
      if (allowedExtensions.includes(fileExtension)) {
        return cb(null, true);
      } else {
        return cb(new Error("Invalid file type. Supported types: images and archives (ZIP, RAR, 7z)."));
      }
    },
  };
};
