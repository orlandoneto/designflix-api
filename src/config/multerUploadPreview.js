const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const aws = require("aws-sdk");
const multerS3 = require("multer-s3");
const sharp = require("sharp");
const { CONST } = require("../utils/constants/constants");

const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: CONST.LIMIT_SIZE_IMG,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "image/jpeg",
      "image/pjpeg",
      "image/png",
      "image/gif",
      "image/svg+xml",
      "application/vnd.corel-draw",
      "image/vnd.adobe.photoshop",
      "application/x-canva",
    ];

    const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".svg"];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const fileExtension = path.extname(file.originalname).toLowerCase();
      if (allowedExtensions.includes(fileExtension)) {
        cb(null, true);
      } else {
        cb(new Error("Invalid file type. Supported types: images."));
      }
    }
  },
});

const addWatermark = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    const watermarkPath = path.resolve(__dirname, "../assets/watermark.png");
    const watermark = await sharp(watermarkPath)
      .resize({ width: 100 })
      .png()
      .toBuffer();

    const image = sharp(req.file.buffer);
    const { width, height } = await image.metadata();
    const watermarkImage = sharp(watermark);
    const { width: watermarkWidth, height: watermarkHeight } =
      await watermarkImage.metadata();

    const left = Math.round((width - watermarkWidth) / 2);
    const top = Math.round((height - watermarkHeight) / 2);

    const processedImage = await image
      .composite([
        {
          input: watermark,
          left: left,
          top: top,
          blend: "overlay",
          opacity: 0.5,
        },
      ])
      .toBuffer();

    const fileName = `${process.env.FOLDER_IMAGE_PREVIEW}/${crypto
      .randomBytes(16)
      .toString("hex")}-${req.file.originalname}`;

    await s3
      .putObject({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName,
        Body: processedImage,
        ContentType: req.file.mimetype,
        ACL: "public-read",
      })
      .promise();

    req.file.location = `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${fileName}`;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadPreview: upload,
  addWatermark,
};
