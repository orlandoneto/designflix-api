const { isLocalUploadMode } = require("../utils/isLocalUploadMode");

/**
 * Entrada única: env escolhe cópia local vs middleware S3 original.
 * Não altera a lógica interna de removeAvatarFromS3.js.
 */
module.exports = async function removeAvatar(req, res, next) {
  if (isLocalUploadMode()) {
    return require("./removeAvatar.local")(req, res, next);
  }
  return require("./removeAvatarFromS3")(req, res, next);
};
