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

const PLAN_NAMES = {
  free: "Gratuito",
  monthly: "Mensal",
  semi_annual: "Semestral",
  annual: "Anual",
};

const PLAN_VALUES = {
  free: "0,00",
  monthly: "29,90",
  semi_annual: "161,46",
  annual: "284,04",
};

module.exports = { ROLES, CONST, PLAN_NAMES, PLAN_VALUES };
