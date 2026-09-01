const multer = require("multer");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { logMultpleUpload } = require("../config/testingLogs");
const { getUnifiedUploadService } = require("../services/unified-upload.factory");
const UnifiedUploadIntegrationService = require("../services/unified-upload-integration.service");
const AuthenticateRoute = require("../middleware/authentication");
const { CONST } = require("../utils/constants/constants");

/**
 * Upload de packs/conteúdo do grid (canônico: /unified-upload/*).
 * Avatar continua em /upload/avatar/site — ver docs/ARCHITECTURE.md.
 *
 * Env decide a implementação:
 * - STORAGE_TYPE=local | STORAGE_DRIVER=local → cópia local (disco)
 * - caso contrário → UnifiedUploadService S3 original
 */
module.exports = (app) => {
  const unifiedUploadService = getUnifiedUploadService();
  const integrationService = new UnifiedUploadIntegrationService();

  /**
   * Endpoint unificado para upload de arquivo compactado único
   * POST /unified-upload/single
   * 
   * Body:
   * - file: arquivo compactado (ZIP, RAR, 7Z, etc.)
   * - categoryId: ID da categoria (opcional)
   * - categoryName: Nome da categoria (opcional)
   * - saveToGrid: boolean para salvar automaticamente no UserMainGrid (padrão: true)
   */
  app.post(
    "/unified-upload/single",
    AuthenticateRoute(["admin", "user"]),
    unifiedUploadService.getMulterConfig(),
    async (req, res) => {
      try {
        // Capturar dados do FormData
        const { categoryId, categoryName, availability } = req.body;
        logMultpleUpload("Upload único - Dados recebidos:", {
          categoryId,
          categoryName,
          availability,
          fileName: req.file ? req.file.originalname : 'N/A'
        });

        // Fazer upload e processamento
        const uploadResult = await unifiedUploadService.uploadSingle(req, res);

        // Se o upload foi bem-sucedido, sempre salvar no grid
        if (uploadResult.status === "success") {
          const userId = (req.body && (req.body.user_id || req.body.userId)) || req.params.userId || null;
          const adminId = (req.params && req.params.adminId) ? req.params.adminId : null;

          console.log("💾 Salvando no grid:", { userId, adminId, categoryId, categoryName });

          // Salvar no UserMainGrid
          const savedRecord = await integrationService.saveToUserMainGrid(
            { ...uploadResult.data, availability: req.body.availability },
            userId,
            adminId
          );

          // Adicionar informações do registro salvo
          uploadResult.data.savedRecord = savedRecord;
          uploadResult.message += " and saved to grid";
        }

        res.status(200).send(uploadResult);
      } catch (error) {
        console.error("Error in unified upload single:", error);
        res.status(500).send({
          status: "error",
          message: error.message
        });
      }
    }
  );

  /**
   * Endpoint unificado para upload de múltiplos arquivos compactados
   * POST /unified-upload/multiple
   * 
   * Body:
   * - files: array de arquivos compactados (máx ${CONST.MAX_UPLOAD_FILES_PER_UPLOAD})
   * - categoryId: ID da categoria (opcional)
   * - categoryName: Nome da categoria (opcional)
   * - saveToGrid: boolean para salvar automaticamente no UserMainGrid (padrão: true)
   */
  app.post(
    "/unified-upload/multiple",
    AuthenticateRoute(["user"]),
    (req, res, next) => {
      // Configuração para múltiplos arquivos + campos de texto
      const uploadTempDir = path.join(os.tmpdir(), "designflix-upload");
      const storage = multer.diskStorage({
        destination: (req, file, cb) => {
          try {
            if (!fs.existsSync(uploadTempDir)) {
              fs.mkdirSync(uploadTempDir, { recursive: true });
            }
          } catch (e) { console.error("Error in multer multiple:", e); }
          cb(null, uploadTempDir);
        },
        filename: (req, file, cb) => {
          const rand = crypto.randomBytes(12).toString("hex");
          cb(null, `${Date.now()}-${rand}-${file.originalname}`);
        }
      });

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
        "application/octet-stream", // Windows/Chrome costuma mandar ZIP assim
      ];
      const allowedExtensions = [".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".tgz", ".tbz", ".tbz2"];

      const multerConfig = multer({
        storage,
        limits: {
          fileSize: CONST.LIMIT_UPLOAD_SIZE_ZIP, // 1GB por arquivo
          files: CONST.MAX_UPLOAD_FILES_PER_UPLOAD // Máximo de arquivos
        },
        fileFilter: (req, file, cb) => {
          const fileExtension = path.extname(file.originalname || "").toLowerCase();
          const mimeOk = allowedMimes.includes(file.mimetype);
          const extOk = allowedExtensions.includes(fileExtension);

          // octet-stream só passa se a extensão for de arquivo compactado
          if (file.mimetype === "application/octet-stream" && !extOk) {
            console.warn("[unified-upload] rejected:", {
              name: file.originalname,
              mime: file.mimetype,
            });
            return cb(new Error("Invalid file type. Supported types: ZIP, RAR, 7Z, TAR, GZ, BZ2, TGZ, TBZ"));
          }

          if (mimeOk || extOk) {
            return cb(null, true);
          }

          console.warn("[unified-upload] rejected:", {
            name: file.originalname,
            mime: file.mimetype,
          });
          cb(new Error("Invalid file type. Supported types: ZIP, RAR, 7Z, TAR, GZ, BZ2, TGZ, TBZ"));
        },
      }).fields([
        { name: 'files', maxCount: CONST.MAX_UPLOAD_FILES_PER_UPLOAD },
        { name: 'files[]', maxCount: CONST.MAX_UPLOAD_FILES_PER_UPLOAD }
      ]);

      multerConfig(req, res, (err) => {
        if (err) {
          const status = err.code === "LIMIT_FILE_SIZE" || err.code === "LIMIT_FILE_COUNT" ? 413 : 400;
          return res.status(status).send({ status: "error", message: err.message });
        }
        next();
      });
    },
    async (req, res) => {
      try {
        // Fazer upload e processamento
        const uploadResult = await unifiedUploadService.uploadMultiple(req, res);

        // Se o upload foi bem-sucedido, sempre salvar no grid
        if (uploadResult.status === "success") {
          const availability = req.body.availability;
          // Salvar no UserMainGrid
          const savedRecords = await integrationService.processAndSave(
            uploadResult,
            req.body.user_id || null,
            null,
            { availability }
          );

          // Adicionar informações dos registros salvos
          uploadResult.data.savedRecords = savedRecords;
          uploadResult.message += " and saved to grid";
        }

        res.status(200).send(uploadResult);
      } catch (error) {
        console.error("Error in unified upload multiple:", error);
        res.status(500).send({
          status: "error",
          message: error.message
        });
      }
    }
  );

  /**
   * Endpoint para obter informações sobre o serviço unificado
   * GET /unified-upload/info
   */
  app.get(
    "/unified-upload/info",
    (req, res) => {
      res.status(200).send({
        status: "success",
        message: "Unified Upload Service Information",
        data: {
          service: "DesignFlix Unified Upload Service",
          version: "1.0.0",
          description: "Processa arquivos compactados e extrai preview + conteúdo automaticamente",
          supportedFormats: {
            archives: ["ZIP", "RAR", "7Z", "TAR", "GZ", "BZ2"],
            images: ["JPG", "PNG", "GIF", "SVG", "PSD", "AI", "CDR", "EPS", "WEBP"],
            content: ["PSD", "AI", "CDR", "EPS", "ZIP", "RAR", "7Z", "PDF"]
          },
          features: [
            "Detecção automática de formato de imagem",
            "Geração automática de tags baseada no nome",
            "Processamento de marca d'água (suave para thumb, completa para preview)",
            "Conversão automática para WebP",
            "Upload para S3 com organização em pastas",
            "Processamento com Node.js streams para alta performance",
            `Suporte a upload único ou múltiplo (até ${CONST.MAX_UPLOAD_FILES_PER_UPLOAD} arquivos)`
          ],
          endpoints: {
            single: "POST /unified-upload/single - Upload de arquivo único",
            multiple: "POST /unified-upload/multiple - Upload de múltiplos arquivos",
            info: "GET /unified-upload/info - Informações do serviço"
          },
          limits: {
            maxFileSize: "100MB por arquivo",
            maxFiles: `${CONST.MAX_UPLOAD_FILES_PER_UPLOAD} arquivos por upload`,
            maxConcurrent: "Processamento sequencial para estabilidade"
          }
        }
      });
    }
  );
};
