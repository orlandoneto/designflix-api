const { GetObjectCommand } = require('@aws-sdk/client-s3');
const {
  createObjectStorageClient,
  getBucketName,
  guessContentType,
  isR2Mode,
  getStorageDriver,
} = require('../utils/objectStorage');

/**
 * Proxy público de objetos do R2/S3 quando não há CDN (R2_PUBLIC_URL).
 * GET /storage/thumbs_test/foo.webp
 */
module.exports = (app) => {
  app.get('/storage/*', async (req, res) => {
    try {
      const driver = getStorageDriver();
      if (driver === 'local') {
        return res.status(404).send({ success: false, message: 'Use /uploads em modo local' });
      }

      const key = String(req.params[0] || '')
        .replace(/^\/+/, '')
        .replace(/\.\./g, '');
      if (!key || key.includes('..')) {
        return res.status(400).send({ success: false, message: 'Key inválida' });
      }

      const client = createObjectStorageClient();
      const out = await client.send(
        new GetObjectCommand({
          Bucket: getBucketName(),
          Key: key,
        })
      );

      const contentType =
        out.ContentType && out.ContentType !== 'application/octet-stream'
          ? out.ContentType
          : guessContentType(key);

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      if (out.ContentLength != null) {
        res.setHeader('Content-Length', String(out.ContentLength));
      }

      if (out.Body && typeof out.Body.pipe === 'function') {
        out.Body.pipe(res);
        return;
      }

      const buf = Buffer.from(await out.Body.transformToByteArray());
      return res.send(buf);
    } catch (err) {
      console.error('[storage/proxy]', err.name, err.message);
      if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
        return res.status(404).send({ success: false, message: 'Arquivo não encontrado' });
      }
      return res.status(500).send({ success: false, message: 'Erro ao servir arquivo' });
    }
  });

  if (isR2Mode()) {
    console.log('📦 Storage proxy: GET /storage/* → R2');
  }
};
