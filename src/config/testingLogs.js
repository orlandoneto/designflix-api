const REDIS_LOGS_ENABLED = false;
const REDIS_CONNECTION_LOGS_ENABLED = false;
const MULTIPLE_UPLOAD_LOGS_ENABLED = true;

module.exports = {
  // Constantes para controle
  REDIS_LOGS_ENABLED,
  REDIS_CONNECTION_LOGS_ENABLED,
  MULTIPLE_UPLOAD_LOGS_ENABLED,

  // Função helper para logs condicionais
  logRedis: function (message, ...args) {
    if (REDIS_LOGS_ENABLED) {
      console.log(`🗑️ ${message}`, ...args);
    }
  },

  logRedisConnection: function (message, ...args) {
    if (REDIS_CONNECTION_LOGS_ENABLED) {
      console.log(`🔌 ${message}`, ...args);
    }
  },

  logMultpleUpload: function (message, ...args) {
    if (MULTIPLE_UPLOAD_LOGS_ENABLED) {
      console.log(`🗑️ ${message}`, ...args);
    }
  }
};