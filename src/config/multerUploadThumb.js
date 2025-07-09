const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const aws = require("aws-sdk");
const sharp = require("sharp");
const { CONST, FOLDER_NAME_THUMBS_PATH } = require("../utils/constants/constants");

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
      "image/webp",
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

const uploadToS3 = async (fileName, processedImage, mimeType) => {
  await s3
    .putObject({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
      Body: processedImage,
      ContentType: mimeType,
      ACL: "public-read",
    })
    .promise();

  return `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${fileName}`;
};

const addWatermarkSoft = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    const watermarkPath = path.resolve(__dirname, "../assets/watermark.png");
    const image = sharp(req.file.buffer);
    const { width, height } = await image.metadata();

    // Redimensiona a imagem para largura máxima de 1200px mantendo proporção
    const resizedImageBuffer = await image.resize({ width: 1200, withoutEnlargement: true }).toBuffer();
    const resizedImage = sharp(resizedImageBuffer);
    const { width: resizedWidth, height: resizedHeight } = await resizedImage.metadata();

    // Redimensiona a marca d'água para ocupar 40% da largura da imagem redimensionada
    const watermarkWidth = Math.floor(resizedWidth * 0.4);
    const watermark = await sharp(watermarkPath)
      .resize({ width: watermarkWidth })
      .png()
      .toBuffer();

    // Obtém altura da marca d'água redimensionada
    const watermarkMeta = await sharp(watermark).metadata();
    const left = Math.floor((resizedWidth - watermarkMeta.width) / 2);
    const top = Math.floor((resizedHeight - watermarkMeta.height) / 2);

    const processedImage = await resizedImage
      .composite([
        {
          input: watermark,
          left: left,
          top: top,
          blend: "overlay",
          opacity: 0.15, // Marca d'água bem suave
        },
      ])
      .toBuffer();
    const webpImage = await convertToWebP(processedImage);

    const fileName = `${FOLDER_NAME_THUMBS_PATH}/${crypto
      .randomBytes(16)
      .toString("hex")}-${Date.now()}.webp`;

    req.file.location = await uploadToS3(fileName, webpImage, "image/webp");
    next();
  } catch (error) {
    next(error);
  }
};

const convertToWebP = async (imageBuffer) => {
  try {
    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error("Invalid image buffer");
    }
    return await sharp(imageBuffer).webp({ quality: 80 }).toBuffer();
  } catch (error) {
    console.error("Error converting image to WebP:", error);
    throw error;
  }
};

module.exports = {
  uploadThumb: upload,
  addWatermarkSoft,
};
