const Redis = require('ioredis');

console.log('🔄 Inicializando cliente Redis...');

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
  console.log(`✅ Redis conectado em ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`);
});

redis.on('ready', () => {
  console.log('✅ Redis está pronto para uso');
  console.log('📊 Status da conexão:', redis.status);
});

redis.on('error', (err) => {
  console.error('❌ Erro no Redis:', err.message);
  console.log('⚠️ A aplicação continuará funcionando sem Redis');
});

redis.on('close', () => {
  console.log('🔌 Redis desconectado');
});

redis.on('reconnecting', () => {
  console.log('🔄 Reconectando ao Redis...');
});

// Log inicial do status
console.log(`🔍 Tentando conectar ao Redis em ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`);

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
