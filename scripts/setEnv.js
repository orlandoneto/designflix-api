const fs = require('fs');
const path = require('path');

// Recebe o argumento do ambiente (development, production, test)
const env = process.argv[2];

if (!env) {
  console.error("Por favor, especifique o ambiente: development, production ou test");
  process.exit(1);
}

const sourceEnvFile = path.resolve(__dirname, `../.env.${env}`);
const targetEnvFile = path.resolve(__dirname, '../.env');

if (!fs.existsSync(sourceEnvFile)) {
  console.error(`Arquivo de configuração .env.${env} não encontrado.`);
  process.exit(1);
}

// Copia o arquivo de configuração do ambiente para .env
fs.copyFileSync(sourceEnvFile, targetEnvFile);

console.log(`Arquivo de ambiente configurado para: ${env}`);
