const fs = require("fs");
const path = require("path");

// Lê os argumentos passados no script
const [, , env] = process.argv;

if (!env) {
  console.error("Por favor, forneça o ambiente (ex: development, production).");
  process.exit(1);
}

// Define a variável NODE_ENV
process.env.NODE_ENV = env;

// Carrega variáveis do arquivo .env se existir
const envPath = path.resolve(__dirname, `../.env.${env}`);

if (fs.existsSync(envPath)) {
  require("dotenv").config({ path: envPath });
} else {
  console.warn(`Nenhum arquivo .env.${env} encontrado.`);
}
