const { Queue, QueueEvents, connection } = require('../config/bullmq');
const { CONST } = require('../utils/constants/constants');

// Nome da fila
const QUEUE_NAME = 'unified-upload';

// Opções padrão de job
const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000,
  },
  removeOnComplete: 1000,
  removeOnFail: 1000,
  timeout: Math.max(CONST.S3_UPLOAD_TIMEOUT_MS * 2, 15 * 60 * 1000), // 15min mínimo
};

// Cria fila e eventos
const queue = new Queue(QUEUE_NAME, { connection, defaultJobOptions });
const queueEvents = new QueueEvents(QUEUE_NAME, { connection });

queueEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log(`[Queue:${QUEUE_NAME}] Job ${jobId} completed`);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`[Queue:${QUEUE_NAME}] Job ${jobId} failed: ${failedReason}`);
});

module.exports = {
  QUEUE_NAME,
  queue,
  queueEvents,
  defaultJobOptions,
};


