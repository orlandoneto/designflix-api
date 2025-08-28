const crypto = require("crypto");
const { S3Client } = require("@aws-sdk/client-s3");
const multerS3 = require("multer-s3");
const { CONST } = require("../utils/constants/constants");
const EnvironmentPaths = require("../utils/environmentPaths");

const storageTypes = {
  s3: () => multerS3({
    s3: new S3Client({
      region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    }),
    bucket: process.env.AWS_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    acl: "public-read",
    key: (req, file, cb) => {
      crypto.randomBytes(16, (err, hash) => {
        if (err) cb(err);

        // Usar path do ambiente (profile_test ou profile)
        const profilePath = EnvironmentPaths.getProfilePath();
        const fileName = `${profilePath}/${hash.toString("hex")}-${file.originalname}`;
        cb(null, fileName);
      });
    },
  }),
};

module.exports = () => {
  return {
    storage: storageTypes.s3(),
    limits: {
      fileSize: CONST.LIMIT_SIZE_IMG,
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/svg+xml",
        "application/zip",
        "application/x-rar-compressed",
        "application/x-7z-compressed",
      ];

      const allowedExtensions = [
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".svg",
        ".zip",
        ".rar",
        ".7z",
      ];

      // Verificar MIME type
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
        return;
      }

      // Verificar extensão do arquivo
      const path = require("path");
      const fileExtension = path.extname(file.originalname).toLowerCase();
      if (allowedExtensions.includes(fileExtension)) {
        cb(null, true);
      } else {
        cb(new Error("Invalid file type. Supported types: images and archives (ZIP, RAR, 7z)."));
      }
    },
  };
};
