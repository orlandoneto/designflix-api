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
  free_1_downloads: "Gratuito",
  "5_downloads": "5 Downloads",
  "10_downloads": "10 Downloads",
  "20_downloads": "20 Downloads",
};

const PLAN_VALUES = {
  free_1_downloads: "0,00",
  "5_downloads": "29,90",
  "10_downloads": "42,90",
  "20_downloads": "72,90",
};

const PALN_COMMISSION = {
  comission_contributor: 10, // R$ 0,10 (10 centavos) em centavos
  payout_contributor: 10000, // R$ 100,00 em centavos
};

// S3 FOLDERS
const FOLDER_NAME_IMAGES_PATH = "downloads";
const FOLDER_IMAGES_PROFILE = "profile";
const FOLDER_NAME_THUMBS_PATH = "thumbs";
const FOLDER_IMAGE_PREVIEWS_PATH = "preview";

module.exports = {
  ROLES,
  CONST,
  PLAN_NAMES,
  PLAN_VALUES,
  PALN_COMMISSION,
  FOLDER_NAME_IMAGES_PATH,
  FOLDER_IMAGES_PROFILE,
  FOLDER_NAME_THUMBS_PATH,
  FOLDER_IMAGE_PREVIEWS_PATH,
};
