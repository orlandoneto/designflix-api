// Carrega as variáveis de ambiente primeiro
require("dotenv").config({ path: require('path').resolve(__dirname, '../.env') });

// Inicializa o Redis
const { redis } = require("./config/redis");
const { logRedisConnection } = require("./config/testingLogs");
logRedisConnection('Cliente Redis carregado com sucesso');

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");

const http = require("http");
const { setupWebSocket } = require("./config/websocket");
const { CONST } = require("./utils/constants/constants");
const BotDetectionMiddleware = require("./middleware/botDetection");

// Log das variáveis de ambiente importantes
console.log('\n=== Configuração do Ambiente ===');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`NODE_PORT: ${process.env.NODE_PORT}`);
console.log(`LOG_LEVEL: ${process.env.LOG_LEVEL}`);
console.log('===============================\n');

const app = express();
const server = http.createServer(app);
// Timeouts para uploads longos
server.headersTimeout = CONST.SERVER_HEADERS_TIMEOUT_MS;
server.requestTimeout = CONST.SERVER_REQUEST_TIMEOUT_MS;
server.keepAliveTimeout = CONST.SERVER_KEEP_ALIVE_TIMEOUT_MS;
app.set('trust proxy', 1);

// Logar o tempo de execução do cron job
const logger = require("./config/logger");
app.use(morgan("combined", { stream: logger.stream }));

// Importar o cron job
require("./cron/upgradeStripePlansJob")();
require("./cron/removeStripeExpiredPlansJob")();

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = (process.env.FRONTEND_URLS || "")
        .split(",")
        .map(url => url.trim().replace(/\/$/, ""))
        .filter(Boolean);

      const allowedOriginsWithSlash = allowedOrigins.map(url => url + "/");
      const allAllowed = [...allowedOrigins, ...allowedOriginsWithSlash];

      const allowAll = process.env.ALLOW_ALL_CORS === 'true' || process.env.NODE_ENV === 'development';
      if (allowAll || !origin || allAllowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: CONST.LIMIT_MAIN }));
app.use(morgan("dev"));
app.use("/", express.static(path.resolve(__dirname, "..", "public")));
app.use("/uploads", express.static(path.resolve(__dirname, "..", "uploads")));
// Proxy R2/S3 para o browser quando não há CDN (R2_PUBLIC_URL)
require("./controller/storage.controller")(app);

app.use(
  express.urlencoded({
    extended: true,
    limit: CONST.LIMIT_MAIN,
    parameterLimit: "9999999",
  })
);

setupWebSocket(server);

// Inicializar middleware de detecção de bots
const botDetection = new BotDetectionMiddleware();

// Middleware para disponibilizar o Redis
app.use((req, res, next) => {
  req.redis = redis;
  if (redis.status === 'ready') {
    logRedisConnection('Redis disponível nas requisições');
  } else {
    logRedisConnection('Redis ainda não está pronto, status:', redis.status);
  }
  next();
});

// Middleware de detecção de bots (marca req.isBot; HTML legado em routes/bot-seo)
app.use(botDetection.middleware());

// ----- Domínio: catálogo -----
// Canônico: /catalog/* (ver docs/contextos/catalog.md)
require("./controller/catalog.controller")(app);
require("./controller/user-main-grid.controller")(app);
require("./controller/category.controller")(app);
require("./controller/tags.controller")(app);

// ----- Domínio: auth / usuário -----
require("./controller/auth-public.controller")(app);
require("./controller/system.controller")(app);
require("./controller/user.controller")(app);
require("./controller/contributor.controller")(app);
require("./controller/marketing-calendar.controller")(app);
require("./controller/user-address.controller")(app);

// ----- Domínio: admin (separado do app público) -----
require("./controller/admin.controller")(app);

// ----- Domínio: upload -----
// Env: STORAGE_TYPE=local|s3|r2 (ou STORAGE_DRIVER)
// Avatar: /upload/avatar/site | Packs/grid: /unified-upload/* (ver docs/ARCHITECTURE.md)
const { isLocalUploadMode } = require("./utils/isLocalUploadMode");
const { getStorageDriver } = require("./utils/objectStorage");
if (isLocalUploadMode()) {
  require("./controller/upload.local.controller")(app);
} else {
  require("./controller/upload.controller")(app);
}
require("./controller/unified-upload.controller")(app);

// ----- Domínio: billing / social / misc -----
require("./controller/google-api.controller")(app);
require("./controller/payment.controller")(app);
require("./controller/user-bug.controller")(app);
require("./controller/complaints.controller")(app);
require("./controller/favorites.controller")(app);
require("./controller/downloadS3.controller")(app);
require("./controller/user-downloads.controller")(app);
require("./controller/user-follows.controller")(app);
require("./controller/plans-download-limit.controller")(app);
require("./controller/user-commissions.controller")(app);
require("./controller/user-plans.controller")(app);
require("./controller/landing-page.controller")(app);
require("./controller/partners.controller")(app);
require("./controller/ia/remove-background.controller")(app);

// ----- Legado SEO HTML (desligar com ENABLE_BOT_HTML=false) -----
require("./routes/bot-seo.routes")(app, botDetection);

server.listen(process.env.NODE_PORT, () => {
  console.log('\n=== Servidor Iniciado ===');
  console.log(`Servidor rodando na porta ${process.env.NODE_PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV}`);
  const { isLocalUploadMode } = require("./utils/isLocalUploadMode");
  const { getStorageDriver } = require("./utils/objectStorage");
  const LocalObjectStore = require("./utils/localObjectStore");
  if (isLocalUploadMode()) {
    console.log(`Upload: LOCAL copy → ${LocalObjectStore.getPublicBaseUrl()}/uploads`);
  } else {
    console.log(`Upload: ${getStorageDriver() === "r2" ? "Cloudflare R2" : "AWS S3"}`);
  }
  console.log('========================\n');
});
