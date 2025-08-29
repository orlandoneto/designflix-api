const multer = require("multer");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { logMultpleUpload } = require("../config/testingLogs");
const UnifiedUploadService = require("../services/unified-upload.service");
const UnifiedUploadIntegrationService = require("../services/unified-upload-integration.service");
const AuthenticateRoute = require("../middleware/authentication");
const { CONST } = require("../utils/constants/constants");
const { queue: unifiedUploadQueue, queueEvents } = require("../queues/unifiedUpload.queue");

module.exports = (app) => {
  const unifiedUploadService = new UnifiedUploadService();
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
        const { categoryId, categoryName } = req.body;
        logMultpleUpload("Upload único - Dados recebidos:", {
          categoryId,
          categoryName,
          fileName: req.file ? req.file.originalname : 'N/A'
        });

        // Fazer upload e processamento
        const uploadResult = await unifiedUploadService.uploadSingle(req, res);

        // Se o upload foi bem-sucedido, sempre salvar no grid
        if (uploadResult.status === "success") {
          const userId = req.user.id;
          const adminId = req.user.role === 'admin' ? req.user.id : null;

          console.log("💾 Salvando no grid:", { userId, adminId, categoryId, categoryName });

          // Salvar no UserMainGrid
          const savedRecord = await integrationService.saveToGrid(
            uploadResult.data,
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
          } catch (e) { }
          cb(null, uploadTempDir);
        },
        filename: (req, file, cb) => {
          const rand = crypto.randomBytes(12).toString("hex");
          cb(null, `${Date.now()}-${rand}-${file.originalname}`);
        }
      });

      const multerConfig = multer({
        storage,
        limits: {
          fileSize: CONST.LIMIT_UPLOAD_SIZE_ZIP, // 1GB por arquivo
          files: CONST.MAX_UPLOAD_FILES_PER_UPLOAD // Máximo de arquivos
        },
        fileFilter: (req, file, cb) => {
          const allowedMimes = [
            "application/zip",
            "application/x-zip-compressed",
            "application/x-rar-compressed",

            "application/x-7z-compressed",
            "application/x-tar",
            "application/gzip",
            "application/x-bzip2",
            "application/x-gtar",
          ];

          const allowedExtensions = [".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".tgz", ".tbz", ".tbz2"];

          if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
          } else {
            const fileExtension = require("path").extname(file.originalname).toLowerCase();
            if (allowedExtensions.includes(fileExtension)) {
              cb(null, true);
            } else {
              cb(new Error("Invalid file type. Supported types: ZIP, RAR, 7Z, TAR, GZ, BZ2, TGZ, TBZ"));
            }
          }
        },
      }).fields([
        { name: 'files', maxCount: CONST.MAX_UPLOAD_FILES_PER_UPLOAD },           // ← Arquivos (campo comum)
        { name: 'files[]', maxCount: CONST.MAX_UPLOAD_FILES_PER_UPLOAD }          // ← Suporte a campo 'files[]'
      ]);

      multerConfig(req, res, next);
    },
    async (req, res) => {
      try {
        // Se BullMQ estiver disponível, enfileirar cada arquivo e aguardar conclusão; senão, fallback para o serviço atual
        const bullAvailable = !!unifiedUploadQueue && !!queueEvents && req.redis && req.redis.status === 'ready';

        let uploadResult;

        if (!bullAvailable) {
          // Fallback: processamento síncrono como antes
          uploadResult = await unifiedUploadService.uploadMultiple(req, res);
        } else {
          // Normalizar arquivos igual ao service
          const normalizeFiles = (rf) => {
            if (!rf) return [];
            if (Array.isArray(rf)) return rf;
            let acc = [];
            if (Array.isArray(rf.files)) acc = acc.concat(rf.files);
            if (Array.isArray(rf["files[]"])) acc = acc.concat(rf["files[]"]);
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
          if (files.length > CONST.MAX_UPLOAD_FILES_PER_UPLOAD) {
            throw new Error(`Maximum ${CONST.MAX_UPLOAD_FILES_PER_UPLOAD} files allowed per upload`);
          }

          const { categoryId, categoryName } = req.body;

          // Enfileirar cada arquivo
          const jobs = [];
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            // Garantir que usamos o caminho do arquivo no disco
            const jobData = {
              filePath: file.path,
              originalName: file.originalname,
              categoryId: categoryId || null,
              categoryName: categoryName || ''
            };
            const job = await unifiedUploadQueue.add('process-archive', jobData, {
              attempts: 3,
              backoff: { type: 'exponential', delay: 5000 },
              timeout: Math.max(CONST.S3_UPLOAD_TIMEOUT_MS * 2, 15 * 60 * 1000)
            });
            jobs.push({ job, index: i, file });
          }

          // Aguardar conclusão de todos os jobs
          const success = [];
          const errors = [];
          for (const { job, index, file } of jobs) {
            try {
              const result = await job.waitUntilFinished(queueEvents, 60 * 60 * 1000); // 60min hard cap
              success.push({
                index,
                originalName: file.originalname,
                size: file.size,
                durationMs: result && result.durationMs ? result.durationMs : undefined,
                result: result && result.result ? result.result : result
              });
            } catch (e) {
              errors.push({
                index,
                originalName: file.originalname,
                size: file.size,
                error: e.message
              });
            } finally {
              // Limpar arquivo temporário caso o worker não tenha removido
              if (file.path) {
                try { await fs.promises.unlink(file.path); } catch (_) { }
              }
            }
          }

          uploadResult = {
            status: "success",
            message: `Processed ${success.length} files successfully` + (errors.length ? `, ${errors.length} failed` : ''),
            data: {
              success,
              errors,
              totalProcessed: success.length,
              totalErrors: errors.length
            }
          };
        }

        // Se o upload foi bem-sucedido, sempre salvar no grid
        if (uploadResult.status === "success") {
          const userId = req.user && req.user.id ? req.user.id : null;

          // Salvar no UserMainGrid
          const savedRecords = await integrationService.processAndSave(
            uploadResult,
            userId,
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
