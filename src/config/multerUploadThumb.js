const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const aws = require("aws-sdk");
const sharp = require("sharp");
const { CONST, FOLDER_NAME_THUMBS_PATH } = require("../utils/constants/constants");

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
}).single("file"); // Adicione .single() aqui

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
    if (!req.file) {
      console.log("Nenhum arquivo recebido para marca d'água");
      return next();
    }

    const watermarkPath = path.resolve(__dirname, "../assets/watermark.png");
    const image = sharp(req.file.buffer);
    const metadata = await image.metadata();

    // Verifique se a imagem é válida
    if (!metadata.width || !metadata.height) {
      console.log("Metadados da imagem não disponíveis");
      return next();
    }

    // Redimensiona a imagem para largura máxima de 400px mantendo proporção
    const resizedWidth = Math.min(metadata.width, 400);
    const resizedImage = sharp(req.file.buffer)
      .resize({ width: resizedWidth, withoutEnlargement: true });

    // Usa as dimensões da imagem redimensionada para o padrão
    const { width: imgW, height: imgH } = await resizedImage.metadata();
    const watermarkWidth = Math.floor(imgW * 0.2);
    const watermark = await sharp(watermarkPath)
      .resize({ width: watermarkWidth })
      .toBuffer();
    const watermarkMeta = await sharp(watermark).metadata();
    const watermarkHeight = watermarkMeta.height;
    // Calcula quantas marcas d'água cabem na imagem
    const cols = Math.ceil(imgW / (watermarkWidth + 10));
    const rows = Math.ceil(imgH / (watermarkHeight + 10));
    // Cria array de composições para cobrir toda a imagem
    const composites = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const left = col * (watermarkWidth + 10);
        const top = row * (watermarkHeight + 10);
        composites.push({
          input: watermark,
          left,
          top,
          blend: "overlay",
          opacity: 0.3,
        });
      }
    }
    // Aplica a marca d'água em padrão
    const processedImage = await resizedImage
      .composite(composites)
      .toBuffer();

    // Converte para WebP
    const webpImage = await sharp(processedImage)
      .webp({ quality: 80 })
      .toBuffer();

    // Gera nome do arquivo
    const fileName = `${FOLDER_NAME_THUMBS_PATH}/${crypto
      .randomBytes(16)
      .toString("hex")}-${Date.now()}.webp`;

    // Faz upload para S3
    req.file.location = await uploadToS3(fileName, webpImage, "image/webp");
    console.log("Marca d'água aplicada com sucesso");
    next();
  } catch (error) {
    console.error("Erro ao processar marca d'água:", error);
    next(error);
  }
};

module.exports = {
  uploadThumb,
  addWatermarkSoft,
};