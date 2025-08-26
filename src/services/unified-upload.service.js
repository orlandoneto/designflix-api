const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const multer = require("multer");
const { logMultpleUpload } = require("../config/testingLogs");
const ImageProcessor = require("../utils/imageProcessor");
const ArchiveProcessor = require("../utils/archiveProcessor");
const TagGenerator = require("../utils/tagGenerator");
const EnvironmentPaths = require("../utils/environmentPaths");

/**
 * Serviço unificado para upload de arquivos compactados
 * Processa arquivos ZIP, RAR, etc. e extrai preview + conteúdo
 */
class UnifiedUploadService {

  constructor() {
    this.tempDir = null;
  }

  /**
   * Detecta o ambiente e retorna os paths corretos para todos os tipos de arquivo
   */
  getEnvironmentPaths() {
    return EnvironmentPaths.getAllPaths();
  }

  /**
   * Detecta o ambiente e retorna o path correto para downloads
   */
  getEnvironmentDownloadPath() {
    return EnvironmentPaths.getDownloadsPath();
  }

  /**
   * Configuração do multer para arquivos compactados
   */
  getMulterConfig() {
    const storage = multer.memoryStorage();

    return multer({
      storage: storage,
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          "application/zip",
          "application/x-zip-compressed",
          "application/x-rar-compressed",
          "application/x-7z-compressed",
          "application/x-tar",
          "application/gzip",
          "application/x-bzip2"
        ];

        const allowedExtensions = [".zip", ".rar", ".7z", ".tar", ".gz", ".bz2"];

        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          const fileExtension = path.extname(file.originalname).toLowerCase();
          if (allowedExtensions.includes(fileExtension)) {
            cb(null, true);
          } else {
            cb(new Error("Invalid file type. Supported types: ZIP, RAR, 7Z, TAR, GZ, BZ2"));
          }
        }
      },
    }).single("file");
  }

  /**
   * Cria diretório temporário
   */
  async createTempDir() {
    const tempDir = path.join(os.tmpdir(), `designflix-${crypto.randomBytes(8).toString("hex")}`);
    await fs.promises.mkdir(tempDir, { recursive: true });
    this.tempDir = tempDir;
    return tempDir;
  }

  /**
   * Limpa diretório temporário
   */
  async cleanupTempDir() {
    if (this.tempDir && fs.existsSync(this.tempDir)) {
      try {
        await fs.promises.rm(this.tempDir, { recursive: true, force: true });
        console.log(`Cleaned up temp directory: ${this.tempDir}`);
      } catch (error) {
        console.error("Error cleaning up temp directory:", error);
      }
    }
  }

  /**
   * Salva arquivo compactado temporariamente
   */
  async saveTempArchive(fileBuffer, originalName) {
    const tempPath = path.join(this.tempDir, originalName);
    await fs.promises.writeFile(tempPath, fileBuffer);
    return tempPath;
  }

  /**
   * Faz upload do arquivo de conteúdo para S3
   */
  async uploadContentToS3(contentPath, originalName) {
    try {
      // Obter path do ambiente
      const downloadPath = this.getEnvironmentDownloadPath();
      const fileName = ImageProcessor.generateFileName(originalName, downloadPath);
      const fileBuffer = await fs.promises.readFile(contentPath);

      const url = await ImageProcessor.uploadToS3(
        fileName,
        fileBuffer,
        "application/octet-stream"
      );

      return { url, fileName };
    } catch (error) {
      console.error("Error uploading content to S3:", error);
      throw error;
    }
  }

  /**
   * Processa arquivo compactado completo
   */
  async processArchiveFile(fileBuffer, originalName, categoryId = null, categoryName = '') {
    try {
      console.log(`Processing archive: ${originalName}`);

      // Criar diretório temporário
      const tempDir = await this.createTempDir();

      // Salvar arquivo compactado temporariamente
      const archivePath = await this.saveTempArchive(fileBuffer, originalName);

      // Processar arquivo compactado
      const archiveData = await ArchiveProcessor.processArchive(archivePath, tempDir);

      console.log("Archive processed successfully:", archiveData);

      // Ler arquivo de preview
      const previewBuffer = await fs.promises.readFile(archiveData.preview.path);

      // Processar preview (com marca d'água completa)
      const previewResult = await ImageProcessor.processPreview(previewBuffer);
      console.log("Preview processed:", previewResult.url);

      // Processar thumbnail (com marca d'água suave)
      const thumbnailResult = await ImageProcessor.processThumbnail(previewBuffer);
      console.log("Thumbnail processed:", thumbnailResult.url);

      // Upload do arquivo de conteúdo (se houver)
      let contentResult = null;
      if (archiveData.content) {
        contentResult = await this.uploadContentToS3(
          archiveData.content.path,
          archiveData.content.name
        );
        logMultpleUpload("Content uploaded:", contentResult.url);
      }

      // Gerar nome baseado no arquivo de preview
      const baseName = ArchiveProcessor.generateBaseName(archiveData.preview.name);

      // Detectar formato real da imagem
      const imageFormat = await ImageProcessor.detectImageFormat(previewBuffer);

      // Determinar formato do conteúdo
      const contentFormat = archiveData.content
        ? ArchiveProcessor.detectContentFormat(archiveData.content.path)
        : imageFormat.format;

      // Gerar tags baseado no nome e categoria
      const tags = TagGenerator.generateContextualTags(
        archiveData.preview.name,
        contentFormat,
        categoryName
      );

      // Gerar termos para busca
      const terms = TagGenerator.generateTerms(
        archiveData.preview.name,
        tags,
        categoryName
      );

      // Preparar dados para retorno
      const result = {
        name: baseName,
        format: contentFormat,
        url_thumb: thumbnailResult.url,
        url_cover: previewResult.url,
        url: contentResult ? contentResult.url : null,
        terms: terms,
        tags: tags,
        categoryId: categoryId,
        categoryName: categoryName,
        archiveType: archiveData.archiveType,
        imageMetadata: imageFormat,
        contentSize: archiveData.content ? archiveData.content.size : null
      };

      console.log("Archive processing completed successfully");
      console.log("📁 URLs generated:", {
        url_thumb: result.url_thumb,
        url_cover: result.url_cover,
        url: result.url
      });
      return result;

    } catch (error) {
      console.error("Error processing archive file:", error);
      throw error;
    } finally {
      // Sempre limpar arquivos temporários
      await this.cleanupTempDir();
    }
  }

  /**
   * Processa múltiplos arquivos compactados
   */
  async processMultipleArchives(files, categoryId = null, categoryName = '') {
    const results = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      try {
        console.log(`Processing file ${i + 1}/${files.length}: ${files[i].originalname}`);

        const result = await this.processArchiveFile(
          files[i].buffer,
          files[i].originalname,
          categoryId,
          categoryName
        );

        results.push({
          index: i,
          originalName: files[i].originalname,
          result: result
        });

        console.log(`File ${i + 1} processed successfully`);

      } catch (error) {
        console.error(`Error processing file ${i + 1}:`, error);
        errors.push({
          index: i,
          originalName: files[i].originalname,
          error: error.message
        });
      }
    }

    return {
      success: results,
      errors: errors,
      totalProcessed: results.length,
      totalErrors: errors.length
    };
  }

  /**
   * Valida dados de entrada
   */
  validateInput(file, categoryId, categoryName) {
    if (!file || !file.buffer) {
      throw new Error("No file provided");
    }

    if (!file.originalname) {
      throw new Error("File must have a name");
    }

    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      throw new Error(`File size exceeds maximum allowed (${maxSize / (1024 * 1024)}MB)`);
    }

    return true;
  }

  /**
   * Método principal para upload único
   */
  async uploadSingle(req, res) {
    try {
      const { categoryId, categoryName } = req.body;

      // Validar entrada
      this.validateInput(req.file, categoryId, categoryName);

      logMultpleUpload(`Starting single archive upload: ${req.file.originalname}`);

      // Processar arquivo
      const result = await this.processArchiveFile(
        req.file.buffer,
        req.file.originalname,
        categoryId || null,
        categoryName || ''
      );

      return {
        status: "success",
        message: "Archive processed successfully",
        data: result
      };

    } catch (error) {
      console.error("Error in single upload:", error);
      throw error;
    }
  }

  /**
 * Método para upload múltiplo
 */
  async uploadMultiple(req, res) {
    try {
      const { categoryId, categoryName } = req.body;
      // Usar req.files.files quando usando multer.fields()
      const files = req.files?.files || req.files || [];

      if (!files || files.length === 0) {
        throw new Error("No files provided");
      }

      if (files.length > 20) {
        throw new Error("Maximum 20 files allowed per upload");
      }

      logMultpleUpload(`Starting multiple archive upload: ${files.length} files`);

      // Processar múltiplos arquivos
      const results = await this.processMultipleArchives(
        files,
        categoryId || null,
        categoryName || ''
      );

      return {
        status: "success",
        message: `Processed ${results.totalProcessed} files successfully`,
        data: results
      };

    } catch (error) {
      console.error("Error in multiple upload:", error);
      throw error;
    }
  }
}

module.exports = UnifiedUploadService;
