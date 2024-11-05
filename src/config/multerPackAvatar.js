const multer = require("multer");
const crypto = require("crypto");
const aws = require("aws-sdk");
const multerS3 = require("multer-s3");
const { CONST } = require("../utils/constants/constants");

const storageTypes = {
  s3: (folderName) => multerS3({
    s3: new aws.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }),
    bucket: process.env.AWS_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    acl: "public-read",
    key: (req, file, cb) => {
      crypto.randomBytes(16, (err, hash) => {
        if (err) cb(err);

        const fileName = `${folderName}/${hash.toString("hex")}-${file.originalname}`;
        cb(null, fileName);
      });
    },
  }),
};

module.exports = (folderName) => {
  return {
    storage: storageTypes.s3(folderName),
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

      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Invalid file type."));
      }
    },
  };
};
