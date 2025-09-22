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
  LIMIT_UPLOAD_SIZE_ZIP: 1024 * 1024 * 1024, // Limite de tamanho: 1GB
  LIMIT_MAIN: '1gb',
  MAX_UPLOAD_FILES_PER_UPLOAD: 20, // Limite máximo de arquivos por multi-upload
  MAX_CONCURRENT_UPLOADS: 3, // Concorrência controlada no processamento do multi-upload
  SERVER_HEADERS_TIMEOUT_MS: 650000, // ~10m50s
  SERVER_REQUEST_TIMEOUT_MS: 0,      // 0 = sem limite (ou defina 600000 = 10 min)
  SERVER_KEEP_ALIVE_TIMEOUT_MS: 120000, // 2 min
  S3_UPLOAD_TIMEOUT_MS: 10 * 60 * 1000, // 10 minutos por arquivo
  LIMIT_BATCH_TOTAL_SIZE: 5 * 1024 * 1024 * 1024, // 5GB por lote de multi-upload
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

// Forgot redirect url
const FORGOT_REDIRECT_URL = {
  "test_url": "http://localhost:3000",
  "dev_url": "https://test.flixdesign.com.br",
  "prod_url": "https://flixdesign.com.br",
};

const PALN_COMMISSION = {
  comission_contributor: 35, // R$ 0,35 (35 centavos) em centavos
  payout_contributor: 10000, // R$ 100,00 em centavos
};

// S3 FOLDERS
const FOLDER_NAME_IMAGES_PATH = "downloads";
const FOLDER_IMAGES_PROFILE = "profile";
const FOLDER_NAME_THUMBS_PATH = "thumbs";
const FOLDER_IMAGE_PREVIEWS_PATH = "preview";

// Test
const FOLDER_NAME_IMAGES_PATH_TEST = "downloads_test";
const FOLDER_IMAGES_PROFILE_TEST = "profile_test";
const FOLDER_NAME_THUMBS_PATH_TEST = "thumbs_test";
const FOLDER_IMAGE_PREVIEWS_PATH_TEST = "preview_test";

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
  FOLDER_NAME_IMAGES_PATH_TEST,
  FOLDER_IMAGES_PROFILE_TEST,
  FOLDER_NAME_THUMBS_PATH_TEST,
  FOLDER_IMAGE_PREVIEWS_PATH_TEST,
  FORGOT_REDIRECT_URL,
};
