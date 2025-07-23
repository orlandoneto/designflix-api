// Carrega as variáveis de ambiente primeiro
require("dotenv").config({ path: require('path').resolve(__dirname, '../.env') });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");

const http = require("http");
const { setupWebSocket } = require("./config/websocket");

// Log das variáveis de ambiente importantes
console.log('\n=== Configuração do Ambiente ===');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`NODE_PORT: ${process.env.NODE_PORT}`);
console.log(`LOG_LEVEL: ${process.env.LOG_LEVEL}`);
console.log('===============================\n');

const app = express();
const server = http.createServer(app);

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
      // Lê as URLs do env, separa por vírgula e remove espaços extras
      const allowedOrigins = (process.env.FRONTEND_URLS || "")
        .split(",")
        .map(url => url.trim().replace(/\/$/, "")) // remove barra final
        .filter(Boolean);

      // Permite também as URLs com barra no final
      const allowedOriginsWithSlash = allowedOrigins.map(url => url + "/");

      // Junta as duas listas
      const allAllowed = [...allowedOrigins, ...allowedOriginsWithSlash];

      if (!origin || allAllowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan("dev"));
app.use("/", express.static(path.resolve(__dirname, "..", "public")));
app.use("/uploads", express.static(path.resolve(__dirname, "..", "uploads")));

app.use(
  express.urlencoded({
    extended: true,
    limit: "300mb",
    parameterLimit: "9999999",
  })
);

setupWebSocket(server);

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

server.listen(process.env.NODE_PORT, () => {
  console.log('\n=== Servidor Iniciado ===');
  console.log(`Servidor rodando na porta ${process.env.NODE_PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV}`);
  console.log('========================\n');
});
