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
    this.tempDir = null; // não mais usado em concorrência; mantido para compatibilidade
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
          "application/vnd.rar",
          "application/x-7z-compressed",
          "application/x-tar",
          "application/gzip",
          "application/x-gzip",
          "application/x-bzip2",
          "application/x-bzip",
          "application/x-gtar",
          "application/x-compressed",
        ];

        const allowedExtensions = [
          ".zip",
          ".rar",
          ".7z",
          ".tar",
          ".gz",
          ".bz2",
          ".tgz",
          ".tbz",
          ".tbz2"
        ];

        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          const fileExtension = path.extname(file.originalname).toLowerCase();
          if (allowedExtensions.includes(fileExtension)) {
            cb(null, true);
          } else {
            cb(new Error("Invalid file type. Supported types: ZIP, RAR, 7Z, TAR, GZ, BZ2, TGZ, TBZ"));
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
    return tempDir;
  }

  /**
   * Limpa diretório temporário
   */
  async cleanupTempDir(dirPath) {
    const target = dirPath || this.tempDir;
    if (target && fs.existsSync(target)) {
      try {
        await fs.promises.rm(target, { recursive: true, force: true });
        console.log(`Cleaned up temp directory: ${target}`);
      } catch (error) {
        console.error("Error cleaning up temp directory:", error);
      }
    }
  }

  /**
   * Salva arquivo compactado temporariamente
   */
  async saveTempArchive(fileBuffer, originalName, tempDir) {
    const safeName = sanitizeFilename(originalName, 80);
    const tempPath = path.join(tempDir, safeName);
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
    let tempDir;
    try {
      console.log(`Processing archive: ${originalName}`);

      // Criar diretório temporário
      tempDir = await this.createTempDir();

      // Salvar arquivo compactado temporariamente
      const archivePath = await this.saveTempArchive(fileBuffer, originalName, tempDir);

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

      // Gerar nome baseado no arquivo de preview (sanitizado) e manter o original
      const baseName = ArchiveProcessor.generateBaseName(archiveData.preview.name);
      const originalBaseName = ArchiveProcessor.generateBaseName(archiveData.preview.originalName || archiveData.preview.name);

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
        originalName: originalBaseName,
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
      await this.cleanupTempDir(tempDir);
    }
  }

  /**
   * Processa arquivo compactado já salvo no disco (via multer.diskStorage)
   */
  async processArchiveFileFromPath(archiveFilePath, originalName, categoryId = null, categoryName = '') {
    let tempDir;
    try {
      console.log(`Processing archive from path: ${originalName} -> ${archiveFilePath}`);

      // Criar diretório temporário
      tempDir = await this.createTempDir();

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

      // Gerar nome baseado no arquivo de preview (sanitizado) e manter o original
      const baseName = ArchiveProcessor.generateBaseName(archiveData.preview.name);
      const originalBaseName = ArchiveProcessor.generateBaseName(archiveData.preview.originalName || archiveData.preview.name);

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
        originalName: originalBaseName,
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
      await this.cleanupTempDir(tempDir);
    }
  }

  /**
   * Processa múltiplos arquivos compactados com concorrência limitada
   */
  async processMultipleArchives(files, categoryId = null, categoryName = '', correlationId = '') {
    const results = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
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

        // Validar tipo suportado antes de processar
        const archiveType = ArchiveProcessor.detectArchiveType(file.originalname || file.path || "");
        if (!['zip', 'tar', 'targz', 'rar', '7z', 'tarbz2', 'gzip', 'bzip2'].includes(archiveType)) {
          const errMsg = `Unsupported archive type: ${archiveType}. Supported: ZIP, TAR, TAR.GZ, RAR, 7Z, TAR.BZ2`;
          throw new Error(errMsg);
        }

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
      // Normalizar arquivos independentemente do nome do campo (files, files[], etc.)
      const normalizeFiles = (rf) => {
        if (!rf) return [];
        if (Array.isArray(rf)) return rf;
        let acc = [];
        if (Array.isArray(rf.files)) acc = acc.concat(rf.files);
        if (Array.isArray(rf["files[]"])) acc = acc.concat(rf["files[]"]);
        // Incluir quaisquer outros arrays de arquivos presentes
        for (const key of Object.keys(rf)) {
          if (key !== 'files' && key !== 'files[]' && Array.isArray(rf[key])) {
            acc = acc.concat(rf[key]);
          }
        }
        return acc;
      };

      const files = normalizeFiles(req.files);

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
