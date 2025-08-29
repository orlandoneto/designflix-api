const { Worker, connection } = require('../config/bullmq');
const { QUEUE_NAME } = require('../queues/unifiedUpload.queue');
const UnifiedUploadService = require('../services/unified-upload.service');

// Worker para processar um arquivo compactado por job
const uploadService = new UnifiedUploadService();

const processor = async (job) => {
  const data = job.data || {};
  const { filePath, originalName, categoryId = null, categoryName = '' } = data;

  if (!filePath || !originalName) {
    throw new Error('Invalid job data: filePath and originalName are required');
  }

  const result = await uploadService.processArchiveFileFromPath(
    filePath,
    originalName,
    categoryId,
    categoryName
  );

  return {
    originalName,
    result,
  };
};

// Concurrency 1 para estabilidade (o endpoint já controla o lote)
const worker = new Worker(QUEUE_NAME, processor, { connection });

worker.on('completed', (job) => {
  console.log(`[Worker:${QUEUE_NAME}] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker:${QUEUE_NAME}] Job ${job && job.id} failed:`, err && err.message);
});

module.exports = { worker };


