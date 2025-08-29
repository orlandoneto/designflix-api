const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const multer = require("multer");
const { logMultpleUpload } = require("../config/testingLogs");
const { CONST } = require("../utils/constants/constants");
const ImageProcessor = require("../utils/imageProcessor");
const { S3Client } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const ArchiveProcessor = require("../utils/archiveProcessor");
const TagGenerator = require("../utils/tagGenerator");
const EnvironmentPaths = require("../utils/environmentPaths");
const { sanitizeFilename } = require("../utils/filenameSanitizer");

/**
 * Máximo de arquivos permitidos por upload (configurável via CONST)
 */
const MAX_UPLOAD_FILES = CONST.MAX_UPLOAD_FILES_PER_UPLOAD;

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
    const safeName = sanitizeFilename(originalName, 80);
    const tempPath = path.join(this.tempDir, safeName);
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
      const s3 = new S3Client({
        region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });

      const fileStream = fs.createReadStream(contentPath);

      const ac = new AbortController();
      const timeout = setTimeout(() => ac.abort(), CONST.S3_UPLOAD_TIMEOUT_MS);

      const upload = new Upload({
        client: s3,
        params: {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: fileName,
          Body: fileStream,
          ContentType: "application/octet-stream",
          ACL: "public-read",
        },
        queueSize: 4,      // paralelismo de partes
        partSize: 8 * 1024 * 1024, // 8MB por parte
        leavePartsOnError: false,
        abortController: ac,
      });

      try {
        await upload.done();
      } finally {
        clearTimeout(timeout);
      }

      const url = `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${fileName}`;

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

      // IMPORTANTE: O formato retornado deve ser a extensão do CONTEÚDO
      const finalFormat = contentFormat; // Sempre extensão do CONTEÚDO

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
        format: finalFormat, // ✅ CORRIGIDO: Sempre extensão do CONTEÚDO
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
   * Processa arquivo compactado já salvo no disco (via multer.diskStorage)
   */
  async processArchiveFileFromPath(archiveFilePath, originalName, categoryId = null, categoryName = '') {
    try {
      console.log(`Processing archive from path: ${originalName} -> ${archiveFilePath}`);

      // Criar diretório temporário
      const tempDir = await this.createTempDir();

      // Processar arquivo compactado
      const archiveData = await ArchiveProcessor.processArchive(archiveFilePath, tempDir);

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

      // IMPORTANTE: O formato retornado deve ser a extensão do CONTEÚDO
      const finalFormat = contentFormat; // Sempre extensão do CONTEÚDO

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
        format: finalFormat,
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
      console.error("Error processing archive file from path:", error);
      throw error;
    } finally {
      // Sempre limpar arquivos temporários criados pelo serviço
      await this.cleanupTempDir();
    }
  }

  /**
   * Processa múltiplos arquivos compactados com concorrência limitada
   */
  async processMultipleArchives(files, categoryId = null, categoryName = '', correlationId = '') {
    const results = [];
    const errors = [];

    const concurrency = Math.max(1, (CONST.MAX_CONCURRENT_UPLOADS || 3));
    let cursor = 0;

    const worker = async () => {
      while (true) {
        const i = cursor++;
        if (i >= files.length) break;
        const file = files[i];
        const startedAt = Date.now();
        try {
          console.log(`Processing file ${i + 1}/${files.length}: ${file.originalname}`);
          try {
            logMultpleUpload("multi-upload:file:start", {
              correlationId,
              index: i,
              name: file.originalname,
              size: file.size,
            });
          } catch (_) { }

          const result = file.path
            ? await this.processArchiveFileFromPath(
              file.path,
              file.originalname,
              categoryId,
              categoryName
            )
            : await this.processArchiveFile(
              file.buffer,
              file.originalname,
              categoryId,
              categoryName
            );

          results.push({
            index: i,
            originalName: file.originalname,
            size: file.size,
            durationMs: Date.now() - startedAt,
            result: result
          });

          console.log(`File ${i + 1} processed successfully`);
          try {
            logMultpleUpload("multi-upload:file:success", {
              correlationId,
              index: i,
              name: file.originalname,
              size: file.size,
              durationMs: Date.now() - startedAt,
            });
          } catch (_) { }

        } catch (error) {
          console.error(`Error processing file ${i + 1}:`, error);
          errors.push({
            index: i,
            originalName: file.originalname,
            size: file.size,
            durationMs: Date.now() - startedAt,
            error: error.message
          });
          try {
            logMultpleUpload("multi-upload:file:error", {
              correlationId,
              index: i,
              name: file.originalname,
              size: file.size,
              durationMs: Date.now() - startedAt,
              error: error.message,
            });
          } catch (_) { }
        } finally {
          if (file.path) {
            try { await fs.promises.unlink(file.path); } catch (_) { }
          }
        }
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, files.length) }, () => worker());
    await Promise.all(workers);

    return {
      success: results.sort((a, b) => a.index - b.index),
      errors: errors.sort((a, b) => a.index - b.index),
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

      if (files.length > MAX_UPLOAD_FILES) {
        throw new Error(`Maximum ${MAX_UPLOAD_FILES} files allowed per upload`);
      }

      // Calcular tamanho total do lote
      let totalBytes = 0;
      for (const f of files) {
        if (typeof f.size === 'number') {
          totalBytes += f.size;
        } else if (f.path) {
          try {
            const st = await fs.promises.stat(f.path);
            totalBytes += st.size || 0;
          } catch (_) { }
        }
      }

      if (totalBytes > CONST.LIMIT_BATCH_TOTAL_SIZE) {
        throw new Error(`Batch too large. Total ${Math.round(totalBytes / (1024 * 1024))}MB exceeds limit of ${Math.round(CONST.LIMIT_BATCH_TOTAL_SIZE / (1024 * 1024))}MB`);
      }

      logMultpleUpload(`Starting multiple archive upload: ${files.length} files, total ${(totalBytes / (1024 * 1024)).toFixed(2)}MB`);

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
