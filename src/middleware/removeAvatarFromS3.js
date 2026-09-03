const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { User } = require("../models");
const {
  createObjectStorageClient,
  getBucketName,
  extractObjectKeyFromUrl,
  assertObjectStorageConfigured,
} = require("../utils/objectStorage");

module.exports = async function removeAvatarFromS3(req, res, next) {
  const userId = req.params.userId;
  console.log('Middleware removeAvatarFromS3 chamado');
  console.log('userId:', userId);
  if (!userId) return next();

  try {
    assertObjectStorageConfigured();
  } catch {
    return next();
  }

  const s3Client = createObjectStorageClient();
  const bucket = getBucketName();

  try {
    const user = await User.findOne({ where: { id: userId } });
    if (!user || !user.photo) return next();

    let key;
    try {
      key = extractObjectKeyFromUrl(user.photo);
      console.log('Key do storage para remoção:', key);
    } catch (err) {
      console.log('Erro ao extrair key da URL:', err);
      return next();
    }

    const result = await s3Client.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }));
    console.log('Resultado do deleteObject:', result);
    console.log('Remoção do storage concluída');
    next();
  } catch (err) {
    console.error('Erro ao remover avatar do storage:', err);
    next();
  }
};
