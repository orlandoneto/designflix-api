const { isLocalUploadMode } = require("../utils/isLocalUploadMode");
const UnifiedUploadService = require("./unified-upload.service");
const UnifiedUploadServiceLocal = require("./unified-upload.local.service");

/**
 * Escolhe a implementação de upload pelo env.
 * - STORAGE_TYPE=local (ou STORAGE_DRIVER=local) → cópia local
 * - STORAGE_TYPE=r2 → Cloudflare R2 (mesmo service S3 + objectStorage)
 * - qualquer outro → AWS S3 original
 */
function getUnifiedUploadService() {
  if (isLocalUploadMode()) {
    console.log("📦 Unified upload: LOCAL copy (STORAGE_TYPE/DRIVER=local)");
    return new UnifiedUploadServiceLocal();
  }
  const driver = String(
    process.env.STORAGE_DRIVER || process.env.STORAGE_TYPE || "s3"
  )
    .toLowerCase()
    .trim();
  if (driver === "r2" || driver === "cloudflare") {
    console.log("📦 Unified upload: Cloudflare R2");
  } else {
    console.log("📦 Unified upload: AWS S3");
  }
  return new UnifiedUploadService();
}

module.exports = { getUnifiedUploadService };
