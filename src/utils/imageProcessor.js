const sharp = require("sharp");
const path = require("path");
const crypto = require("crypto");
const aws = require("aws-sdk");
const EnvironmentPaths = require("./environmentPaths");

// Configurações
const WEBP_QUALITY_IMAGE = 95;
const HEIGHT_IMAGE = 600;
const OPACITY_WATERMARK = 0.1;
const PREVIEW_WIDTH = 1200;

// Instância S3
const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  correctClockSkew: true,
});

/**
 * Utilitário centralizado para processamento de imagens
 */
class ImageProcessor {

  /**
 * Detecta o ambiente e retorna os paths corretos do S3
 */
  static getEnvironmentPaths() {
    return EnvironmentPaths.getAllPaths();
  }

  /**
   * Faz upload para S3
   */
  static async uploadToS3(fileName, processedImage, mimeType) {
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
  }

  /**
   * Converte imagem para WebP
   */
  static async convertToWebP(imageBuffer, quality = 80) {
    try {
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error("Invalid image buffer");
      }
      return await sharp(imageBuffer).webp({ quality }).toBuffer();
    } catch (error) {
      console.error("Error converting image to WebP:", error);
      throw error;
    }
  }

  /**
   * Redimensiona imagem mantendo proporção
   */
  static async resizeImage(imageBuffer, options = {}) {
    const { width, height, withoutEnlargement = true } = options;

    try {
      let sharpInstance = sharp(imageBuffer);

      if (width && height) {
        sharpInstance = sharpInstance.resize({ width, height, fit: 'contain', withoutEnlargement });
      } else if (width) {
        sharpInstance = sharpInstance.resize({ width, withoutEnlargement });
      } else if (height) {
        sharpInstance = sharpInstance.resize({ height, withoutEnlargement });
      }

      return await sharpInstance.toBuffer();
    } catch (error) {
      console.error("Error resizing image:", error);
      throw error;
    }
  }

  /**
   * Aplica marca d'água suave (para thumbnails)
   */
  static async applySoftWatermark(imageBuffer) {
    try {
      const watermarkPath = path.resolve(__dirname, "../assets/watermark.png");

      // Obter metadados da imagem
      const imageMetadata = await sharp(imageBuffer).metadata();
      if (!imageMetadata || !imageMetadata.width || !imageMetadata.height) {
        throw new Error("Invalid image metadata");
      }

      // Redimensionar para altura máxima
      const targetHeight = Math.min(imageMetadata.height, HEIGHT_IMAGE);
      const resizedBuffer = await this.resizeImage(imageBuffer, { height: targetHeight });

      // Obter metadados da imagem redimensionada
      const resizedMetadata = await sharp(resizedBuffer).metadata();
      const finalWidth = resizedMetadata.width;
      const finalHeight = resizedMetadata.height;

      // Obter metadados da marca d'água
      const watermarkMetadata = await sharp(watermarkPath).metadata();

      // Calcular tamanho da marca d'água (máx 20% da largura, mín 30px)
      const maxWatermarkWidth = Math.max(30, Math.floor(finalWidth * 0.2));
      const watermarkHeight = Math.floor(
        maxWatermarkWidth * (watermarkMetadata.height / watermarkMetadata.width)
      );

      // Verificar se a marca d'água não é maior que a imagem
      if (maxWatermarkWidth > finalWidth || watermarkHeight > finalHeight) {
        throw new Error("Watermark too large for image");
      }

      // Redimensionar marca d'água
      const watermarkBuffer = await sharp(watermarkPath)
        .resize({
          width: maxWatermarkWidth,
          height: watermarkHeight,
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .toBuffer();

      // Calcular posições da grade
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

      // Aplicar marca d'água se houver posições válidas
      let outputBuffer;
      if (composites.length > 0) {
        outputBuffer = await sharp(resizedBuffer)
          .composite(composites)
          .webp({ quality: WEBP_QUALITY_IMAGE })
          .toBuffer();
        console.log("Watermark applied successfully");
      } else {
        outputBuffer = await sharp(resizedBuffer)
          .webp({ quality: WEBP_QUALITY_IMAGE })
          .toBuffer();
        console.log("No valid watermark positions, processed without watermark");
      }

      return outputBuffer;
    } catch (error) {
      console.error("Error applying soft watermark:", error);
      // Fallback: apenas redimensiona e converte para WebP
      const resizedBuffer = await this.resizeImage(imageBuffer, { height: HEIGHT_IMAGE });
      return await this.convertToWebP(resizedBuffer, WEBP_QUALITY_IMAGE);
    }
  }

  /**
   * Aplica marca d'água completa (para previews)
   */
  static async applyFullWatermark(imageBuffer) {
    try {
      const watermarkPath = path.resolve(__dirname, "../assets/watermark.png");

      // Redimensionar imagem original
      const resizedImageBuffer = await this.resizeImage(imageBuffer, { width: PREVIEW_WIDTH });

      const resizedImage = sharp(resizedImageBuffer);
      const { width: imgW, height: imgH } = await resizedImage.metadata();

      // Redimensionar marca d'água para cobrir tudo
      const watermark = await sharp(watermarkPath)
        .resize({
          width: imgW,
          height: imgH,
          fit: "cover",
        })
        .png()
        .toBuffer();

      // Aplicar marca d'água com opacidade
      const finalBuffer = await resizedImage
        .composite([
          {
            input: watermark,
            blend: "over",
            opacity: OPACITY_WATERMARK,
          },
        ])
        .toBuffer();

      // Converte para WebP
      return await this.convertToWebP(finalBuffer, 80);
    } catch (error) {
      console.error("Error applying full watermark:", error);
      // Fallback: apenas redimensiona e converte para WebP
      const resizedBuffer = await this.resizeImage(imageBuffer, { width: PREVIEW_WIDTH });
      return await this.convertToWebP(resizedBuffer, 80);
    }
  }

  /**
   * Processa thumbnail com marca d'água suave
   */
  static async processThumbnail(imageBuffer) {
    try {
      // Obter paths do ambiente
      const envPaths = this.getEnvironmentPaths();

      const processedBuffer = await this.applySoftWatermark(imageBuffer);
      const fileName = `${envPaths.thumbs}/${crypto.randomBytes(16).toString("hex")}-${Date.now()}.webp`;

      const url = await this.uploadToS3(fileName, processedBuffer, "image/webp");
      return { url, fileName };
    } catch (error) {
      console.error("Error processing thumbnail:", error);
      throw error;
    }
  }

  /**
   * Processa preview com marca d'água completa
   */
  static async processPreview(imageBuffer) {
    try {
      // Obter paths do ambiente
      const envPaths = this.getEnvironmentPaths();

      const processedBuffer = await this.applyFullWatermark(imageBuffer);
      const fileName = `${envPaths.previews}/${crypto.randomBytes(16).toString("hex")}-${Date.now()}.webp`;

      const url = await this.uploadToS3(fileName, processedBuffer, "image/webp");
      return { url, fileName };
    } catch (error) {
      console.error("Error processing preview:", error);
      throw error;
    }
  }

  /**
   * Analisa se uma imagem tem fundo transparente (canal alpha) de forma robusta
   * @param {Buffer} imageBuffer - Buffer da imagem
   * @returns {Object} - { hasAlpha: boolean, alphaPercentage: number, isTransparent: boolean }
   */
  static async analyzeImageAlpha(imageBuffer) {
    try {
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();

      // Verificar se tem canal alpha
      if (metadata.channels === 4 && metadata.hasAlpha) {
        // PNG com transparência - analisar pixels para determinar se é realmente transparente
        const { data } = await image.raw().toBuffer({ resolveWithObject: true });

        let transparentPixels = 0;
        let totalPixels = metadata.width * metadata.height;

        // Verificar cada pixel (cada 4 valores = RGBA)
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 128) { // Alpha < 128 = transparente
            transparentPixels++;
          }
        }

        const alphaPercentage = (transparentPixels / totalPixels) * 100;

        return {
          hasAlpha: true,
          alphaPercentage: alphaPercentage,
          isTransparent: alphaPercentage > 15 // Mais de 15% transparente
        };
      }

      // JPG, GIF sem alpha, ou PNG sem transparência
      return {
        hasAlpha: false,
        alphaPercentage: 0,
        isTransparent: false
      };

    } catch (error) {
      console.error('Erro ao analisar canal alpha:', error);
      // Em caso de erro, retorna valores seguros
      return {
        hasAlpha: false,
        alphaPercentage: 0,
        isTransparent: false
      };
    }
  }

  /**
   * Detecta o formato real da imagem baseado nos metadados
   */
  static async detectImageFormat(imageBuffer) {
    try {
      const metadata = await sharp(imageBuffer).metadata();

      // Mapear formatos baseado no formato interno do Sharp
      const formatMap = {
        'jpeg': 'JPG',
        'jpg': 'JPG',
        'png': 'PNG',
        'webp': 'WEBP',
        'gif': 'GIF',
        'svg': 'SVG',
        'tiff': 'TIFF',
        'avif': 'AVIF'
      };

      const detectedFormat = formatMap[metadata.format] || metadata.format?.toUpperCase() || 'UNKNOWN';

      return {
        format: detectedFormat,
        width: metadata.width,
        height: metadata.height,
        channels: metadata.channels,
        hasAlpha: metadata.hasAlpha,
        isOpaque: metadata.isOpaque
      };
    } catch (error) {
      console.error("Error detecting image format:", error);
      throw error;
    }
  }

  /**
   * Gera nome de arquivo único para S3
   */
  static generateFileName(originalName, folder, extension = '') {
    const timestamp = Date.now();
    const randomHash = crypto.randomBytes(16).toString("hex");
    const ext = extension || path.extname(originalName);

    return `${folder}/${randomHash}-${timestamp}${ext}`;
  }
}

module.exports = ImageProcessor;
