const { isLocalUploadMode } = require("../utils/isLocalUploadMode");
const UnifiedUploadService = require("./unified-upload.service");
const UnifiedUploadServiceLocal = require("./unified-upload.local.service");

/**
 * Escolhe a implementação de upload pelo env.
 * - STORAGE_TYPE=local (ou STORAGE_DRIVER=local) → cópia local
 * - qualquer outro → serviço S3 original (intacto)
 */
function getUnifiedUploadService() {
  if (isLocalUploadMode()) {
    console.log("📦 Unified upload: LOCAL copy (STORAGE_TYPE/DRIVER=local)");
    return new UnifiedUploadServiceLocal();
  }
  console.log("📦 Unified upload: S3 original");
  return new UnifiedUploadService();
}

module.exports = { getUnifiedUploadService };
