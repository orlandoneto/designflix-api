// roles.js
const ROLES = {
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
  USER: "user",
  INTERNAL_USER: "internal_user",
  PLANO_PRO: "plano_pro",
};

const CONST = {
  LIMIT_SIZE_IMG: 300 * 1024 * 1024, // Limite de tamanho: 300MB
};

module.exports = { ROLES, CONST };
