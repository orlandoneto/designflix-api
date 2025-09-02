const multer = require("multer");
const { CONST } = require("../utils/constants/constants");

// Armazena em memória; o upload ao S3 será feito no controller
const memoryStorage = multer.memoryStorage();

module.exports = () => {
  return {
    storage: memoryStorage,
    limits: {
      fileSize: CONST.LIMIT_SIZE_IMG,
    },
    fileFilter: (req, file, cb) => {
      // Pré-validação de ambiente AWS para evitar erros do provider
      const hasCreds = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
      const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
      const bucket = process.env.AWS_BUCKET_NAME;
      if (!region || !bucket || !hasCreds) {
        return cb(new Error("AWS S3 não configurado corretamente (region/bucket/credentials)"));
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
