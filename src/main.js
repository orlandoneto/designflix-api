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

// Middleware de detecção de bots
app.use(botDetection.middleware());

// user main grid
require("./controller/user-main-grid.controller")(app);

// category
require("./controller/category.controller")(app);

// tags
require("./controller/tags.controller")(app);

// otp
require("./controller/otps.controller")(app);

// system
require("./controller/system.controller")(app);

// user
require("./controller/user.controller")(app);
require("./controller/user-address.controller")(app);

// admin
require("./controller/admin.controller")(app);

// serviços
require("./controller/upload.controller")(app);

// upload unificado
require("./controller/unified-upload.controller")(app);

// google
require("./controller/google-api.controller")(app);

// Payment
require("./controller/payment.controller")(app);

// Bug Reports
require("./controller/user-bug.controller")(app);

// Complaints
require("./controller/complaints.controller")(app);

// Favorites
require("./controller/favorites.controller")(app);

// Downloads S3
require("./controller/downloadS3.controller")(app);

// User Downloads
require("./controller/user-downloads.controller")(app);

// User Follows
require("./controller/user-follows.controller")(app);

// Plans Download Limits
require("./controller/plans-download-limit.controller")(app);

// User Commissions
require("./controller/user-commissions.controller")(app);

// Plans
require("./controller/user-plans.controller")(app);

// Forgot Signup
require("./controller/forgot.controller")(app);

// Landing Pages
require("./controller/landing-page.controller")(app);

// Partners
require("./controller/partners.controller")(app);

// IA - Remove Background
require("./controller/ia/remove-background.controller")(app);

// ===== ROTAS PARA BOTS (SEO/SOCIAL MEDIA) =====
// Página inicial para bots
app.get('/', botDetection.serveBotHTML({
  title: 'Flixdesign - Sua galeria de design',
  description: 'Flixdesign: Plataforma para designers compartilharem, atualizarem e exibirem seus trabalhos em uma galeria moderna.',
  image: '/favflix.png'
}));

// Página de templates para bots
app.get('/templates', botDetection.serveBotHTML({
  title: 'Templates Premium - Flixdesign',
  description: 'Coleção exclusiva de templates profissionais para web, mobile e print. Designs modernos e responsivos prontos para uso.',
  image: '/favflix.png'
}));

// Página de categorias para bots
app.get('/category/:id', botDetection.serveBotHTML({
  title: 'Categoria de Design - Flixdesign',
  description: 'Explore nossa coleção de recursos de design organizados por categoria. Encontre exatamente o que precisa para seu projeto.',
  image: '/favflix.png'
}));

// Página de usuário/contribuidor para bots
app.get('/user/:id', botDetection.serveBotHTML({
  title: 'Contribuidor - Flixdesign',
  description: 'Conheça nossos contribuidores e explore seus trabalhos exclusivos de design.',
  image: '/favflix.png'
}));

// Fallback para qualquer rota não encontrada - servir HTML para bots
app.get('*', (req, res) => {
  if (req.isBot) {
    return botDetection.serveBotHTML({
      title: 'Flixdesign - Sua galeria de design',
      description: 'Plataforma para designers compartilharem, atualizarem e exibirem seus trabalhos em uma galeria moderna.',
      image: '/favflix.png'
    })(req, res);
  }

  // Para usuários reais, retornar 404 ou redirecionar para SPA
  res.status(404).json({ message: 'Página não encontrada' });
});

server.listen(process.env.NODE_PORT, () => {
  console.log('\n=== Servidor Iniciado ===');
  console.log(`Servidor rodando na porta ${process.env.NODE_PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV}`);
  console.log('========================\n');
});
