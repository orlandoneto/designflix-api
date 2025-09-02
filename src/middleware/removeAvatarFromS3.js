const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { User } = require("../models");

module.exports = async function removeAvatarFromS3(req, res, next) {
  const userId = req.params.userId;
  console.log('Middleware removeAvatarFromS3 chamado');
  console.log('userId:', userId);
  if (!userId) return next();

  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
  const bucket = process.env.AWS_BUCKET_NAME;
  const hasCreds = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

  if (!region || !bucket) {
    return next();
  }

  const s3Client = new S3Client({
    region,
    credentials: hasCreds
      ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
      : undefined,
    defaultsMode: 'standard',
  });

  try {
    const user = await User.findOne({ where: { id: userId } });
    if (!user || !user.photo) return next();

    const photoUrl = user.photo;
    let key;
    try {
      const url = new URL(photoUrl);
      key = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
      console.log('Key do S3 para remoção:', key);
    } catch (err) {
      console.log('Erro ao extrair key da URL:', err);
      return next(); // Não bloqueia o fluxo se a URL for inválida
    }

    const result = await s3Client.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }));
    console.log('Resultado do deleteObject:', result);
    console.log('Remoção do S3 concluída');
    next();
  } catch (err) {
    // Não bloqueia o fluxo se falhar a deleção, apenas loga
    console.error('Erro ao remover avatar do S3:', err);
    next();
  }
};
