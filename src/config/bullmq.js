const { Queue, Worker, QueueEvents, JobsOptions } = require('bullmq');
const { redis } = require('./redis');

// Adaptador de conexão BullMQ usando ioredis existente
const connection = {
  // BullMQ aceita instância do ioredis
  // Usamos duplicatas para evitar bloquear o cliente principal
  createClient: (type) => {
    const client = redis.duplicate();
    // Conectar imediatamente e espelhar eventos básicos
    client.on('error', (err) => {
      console.error(`[BullMQ:${type}] Redis error:`, err.message);
    });
    return client;
  }
};

module.exports = {
  Queue,
  Worker,
  QueueEvents,
  JobsOptions,
  connection,
};


