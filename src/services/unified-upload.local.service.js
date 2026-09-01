const fs = require("fs");
const UnifiedUploadService = require("./unified-upload.service");
const ImageProcessor = require("../utils/imageProcessor");
const ImageProcessorLocal = require("../utils/imageProcessor.local");
const LocalObjectStore = require("../utils/localObjectStore");

/**
 * Cópia do UnifiedUploadService ativada só quando STORAGE_TYPE/DRIVER=local.
 * Reaproveita ZIP/multer/tags/grid do original; grava bytes em /uploads.
 */
class UnifiedUploadServiceLocal extends UnifiedUploadService {
  async uploadContentToS3(contentPath, originalName) {
    try {
      const downloadPath = this.getEnvironmentDownloadPath();
      const fileName = ImageProcessor.generateFileName(originalName, downloadPath);
      const fileStream = fs.createReadStream(contentPath);
      const { url } = await LocalObjectStore.putObject({
        key: fileName,
        body: fileStream,
        contentType: "application/octet-stream",
      });
      return { url, fileName };
    } catch (error) {
      console.error("Error uploading content to local store:", error);
      throw error;
    }
  }

  async processArchiveFile(fileBuffer, originalName, categoryId = null, categoryName = "") {
    return this._withLocalImageProcessor(() =>
      super.processArchiveFile(fileBuffer, originalName, categoryId, categoryName)
    );
  }

  async processArchiveFileFromPath(archiveFilePath, originalName, categoryId = null, categoryName = "") {
    return this._withLocalImageProcessor(() =>
      super.processArchiveFileFromPath(archiveFilePath, originalName, categoryId, categoryName)
    );
  }

  /** Fila em dev: evita misturar patch temporário do ImageProcessor.uploadToS3 */
  async _withLocalImageProcessor(fn) {
    const run = async () => {
      const originalUpload = ImageProcessor.uploadToS3;
      ImageProcessor.uploadToS3 = ImageProcessorLocal.uploadToS3.bind(ImageProcessorLocal);
      try {
        return await fn();
      } finally {
        ImageProcessor.uploadToS3 = originalUpload;
      }
    };

    const prev = UnifiedUploadServiceLocal._tail;
    let release;
    UnifiedUploadServiceLocal._tail = new Promise((resolve) => {
      release = resolve;
    });
    await prev;
    try {
      return await run();
    } finally {
      release();
    }
  }
}

UnifiedUploadServiceLocal._tail = Promise.resolve();

module.exports = UnifiedUploadServiceLocal;
