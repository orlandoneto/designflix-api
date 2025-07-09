const fs = require('fs');
const path = require('path');

// Solução 1: Usar chalk da forma correta para a versão 4.x
const chalk = require('chalk');

// Solução 2: Alternativa sem chalk (usando cores ANSI nativas)
const colors = {
  red: text => `\x1b[31m${text}\x1b[0m`,
  green: text => `\x1b[32m${text}\x1b[0m`,
  bold: text => `\x1b[1m${text}\x1b[0m`
};

// Validação dos ambientes permitidos
const VALID_ENVS = ['development', 'production', 'test'];

// Recebe o argumento do ambiente
const env = process.argv[2] || process.env.NODE_ENV;

// Função para exibir mensagem de erro formatada
function showError(message) {
  console.error(colors.red(`
  ${message}
  
  Uso: node scripts/setEnv.js [environment]
  Ou defina a variável NODE_ENV
  
  Exemplos:
    node scripts/setEnv.js test
    NODE_ENV=production node scripts/setEnv.js
  `));
  process.exit(1);
}

// Verifica se o ambiente é válido
if (!env || !VALID_ENVS.includes(env)) {
  showError(`Por favor, especifique um ambiente válido: ${VALID_ENVS.join(', ')}`);
}

const sourceEnvFile = path.resolve(__dirname, `../.env.${env}`);
const targetEnvFile = path.resolve(__dirname, '../.env');

try {
  // Verifica se o arquivo de origem existe
  if (!fs.existsSync(sourceEnvFile)) {
    throw new Error(`Arquivo de configuração .env.${env} não encontrado em ${sourceEnvFile}`);
  }

  // Copia o arquivo de configuração
  fs.copyFileSync(sourceEnvFile, targetEnvFile);

  // Lê e exibe um resumo das variáveis
  const envContent = fs.readFileSync(sourceEnvFile, 'utf8');
  const varCount = envContent.split('\n')
    .filter(line => line.trim() && !line.trim().startsWith('#'))
    .length;

  console.log(colors.green(`
  ✔ ${colors.bold('Ambiente configurado para:')} ${env}
  ✔ ${colors.bold('Arquivo:')} ${sourceEnvFile}
  ✔ ${colors.bold('Variáveis carregadas:')} ${varCount}
  `));

} catch (error) {
  console.error(colors.red(`
  ❌ ${colors.bold('Erro ao configurar ambiente:')}
  ${error.message}
  `));
  process.exit(1);
}