const Redis = require('ioredis');
const { logRedisConnection } = require('./testingLogs');

logRedisConnection('Inicializando cliente Redis...');

// Configuração simples do Redis
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || null,
  db: process.env.REDIS_DB || 0,
  // Removido lazyConnect: true para conectar imediatamente
  retryDelayOnFailover: 1000,
  maxRetriesPerRequest: 3,
  connectTimeout: 5000,
  commandTimeout: 3000,
});

// Eventos de conexão
redis.on('connect', () => {
  logRedisConnection(`Redis conectado em ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`);
});

redis.on('ready', () => {
  logRedisConnection('Redis está pronto para uso');
  logRedisConnection('Status da conexão:', redis.status);
});

redis.on('error', (err) => {
  logRedisConnection('Erro no Redis:', err.message);
  logRedisConnection('A aplicação continuará funcionando sem Redis');
});

redis.on('close', () => {
  logRedisConnection('Redis desconectado');
});

redis.on('reconnecting', () => {
  logRedisConnection('Reconectando ao Redis...');
});

// Log inicial do status
logRedisConnection(`Tentando conectar ao Redis em ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`);

// Função para aguardar conexão (opcional, para casos onde você precisa garantir que está conectado)
const waitForConnection = async () => {
  if (redis.status === 'ready') {
    return true;
  }

  return new Promise((resolve) => {
    if (redis.status === 'ready') {
      resolve(true);
    } else {
      redis.once('ready', () => resolve(true));
    }
  });
};

// Exportar tanto o cliente quanto a função de espera
module.exports = { redis, waitForConnection };
