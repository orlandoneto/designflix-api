const ImageProcessor = require("./imageProcessor");
const LocalObjectStore = require("./localObjectStore");

/**
 * Cópia do ImageProcessor só para env local.
 * Herda watermark/WebP/resize; só troca o destino do put (disco).
 * O ImageProcessor original (S3) permanece intacto.
 */
class ImageProcessorLocal extends ImageProcessor {
  static async uploadToS3(fileName, processedImage, mimeType) {
    const { url } = await LocalObjectStore.putObject({
      key: fileName,
      body: processedImage,
      contentType: mimeType,
    });
    return url;
  }
}

module.exports = ImageProcessorLocal;
