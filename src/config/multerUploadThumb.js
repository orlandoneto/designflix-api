const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const aws = require("aws-sdk");
const sharp = require("sharp");
const { CONST, FOLDER_NAME_THUMBS_PATH_TEST } = require("../utils/constants/constants");

const WEBP_QUALITY_IMAGE = 95;

const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  correctClockSkew: true,
});

const storage = multer.memoryStorage();

const uploadThumb = multer({
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
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Supported types: jpeg, png, gif, webp."));
    }
  },
}).single("file");

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
  try {
    if (!req.file || !req.file.buffer) {
      console.log("No file or buffer received");
      return next();
    }

    // Generate filename first
    const fileName = `${FOLDER_NAME_THUMBS_PATH_TEST}/${crypto.randomBytes(16).toString("hex")}-${Date.now()}.webp`;

    // Process main image
    let imageMetadata;
    try {
      imageMetadata = await sharp(req.file.buffer).metadata();
    } catch (err) {
      console.error("Error processing image metadata:", err);
      return next();
    }

    if (!imageMetadata || !imageMetadata.width || !imageMetadata.height) {
      console.log("Invalid image metadata");
      // Upload original as WebP if metadata is invalid
      try {
        req.file.location = await uploadToS3(
          fileName,
          await sharp(req.file.buffer).webp({ quality: WEBP_QUALITY_IMAGE }).toBuffer(),
          "image/webp"
        );
        return next();
      } catch (err) {
        console.error("Error uploading original image:", err);
        return next(err);
      }
    }

    // ALTERAÇÃO: Limitar a altura a 300px, largura proporcional (liberada)
    const targetHeight = Math.min(imageMetadata.height, 300);
    let resizedBuffer;
    let finalWidth, finalHeight;
    try {
      const resized = await sharp(req.file.buffer)
        .resize({
          height: targetHeight,  // Limita a altura
          withoutEnlargement: true
        })
        .toBuffer();
      resizedBuffer = resized;
      const resizedMetadata = await sharp(resized).metadata();
      finalWidth = resizedMetadata.width;
      finalHeight = resizedMetadata.height;
    } catch (err) {
      console.error("Error resizing image:", err);
      return next(err);
    }

    try {
      const watermarkPath = path.resolve(__dirname, "../assets/watermark.png");
      const watermarkMetadata = await sharp(watermarkPath).metadata();

      // Calculate watermark size (max 20% of image width, min 30px)
      const maxWatermarkWidth = Math.max(30, Math.floor(finalWidth * 0.2));
      const watermarkHeight = Math.floor(
        maxWatermarkWidth * (watermarkMetadata.height / watermarkMetadata.width)
      );

      // Ensure watermark is not larger than the image
      if (maxWatermarkWidth > finalWidth || watermarkHeight > finalHeight) {
        throw new Error("Watermark too large for image");
      }

      // Resize watermark
      const watermarkBuffer = await sharp(watermarkPath)
        .resize({
          width: maxWatermarkWidth,
          height: watermarkHeight,
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .toBuffer();

      // Calculate grid positions
      const cols = Math.max(1, Math.floor(finalWidth / (maxWatermarkWidth * 1.5)));
      const rows = Math.max(1, Math.floor(finalHeight / (watermarkHeight * 1.5)));

      const composites = [];
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const left = Math.floor(col * (maxWatermarkWidth * 1.5));
          const top = Math.floor(row * (watermarkHeight * 1.5));
          if (left >= 0 && top >= 0 && left + maxWatermarkWidth <= finalWidth && top + watermarkHeight <= finalHeight) {
            composites.push({
              input: watermarkBuffer,
              left,
              top,
              blend: "overlay",
              opacity: 0.3,
            });
          }
        }
      }

      let outputBuffer;
      if (composites.length > 0) {
        // Só faz composite se houver posições válidas
        outputBuffer = await sharp(resizedBuffer)
          .composite(composites)
          .webp({ quality: WEBP_QUALITY_IMAGE })
          .toBuffer();
        console.log("Watermark applied successfully");
      } else {
        // Apenas converte para webp, sem composite
        outputBuffer = await sharp(resizedBuffer)
          .webp({ quality: WEBP_QUALITY_IMAGE })
          .toBuffer();
        console.log("No valid watermark positions, uploaded without watermark");
      }

      req.file.location = await uploadToS3(fileName, outputBuffer, "image/webp");
      return next();

    } catch (err) {
      // Fallback: apenas converte para webp, sem composite
      try {
        const fallbackBuffer = await sharp(resizedBuffer)
          .webp({ quality: WEBP_QUALITY_IMAGE })
          .toBuffer();
        req.file.location = await uploadToS3(fileName, fallbackBuffer, "image/webp");
        console.error("Watermark processing failed, uploaded without watermark:", err);
        return next();
      } catch (uploadError) {
        console.error("Error uploading fallback image:", uploadError);
        return next(uploadError);
      }
    }
  } catch (error) {
    console.error("Unexpected error in addWatermarkSoft:", error);
    next(error);
  }
};

module.exports = {
  uploadThumb,
  addWatermarkSoft,
};