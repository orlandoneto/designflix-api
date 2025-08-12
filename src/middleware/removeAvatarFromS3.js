const aws = require("aws-sdk");
const { User } = require("../models");

module.exports = async function removeAvatarFromS3(req, res, next) {
  const userId = req.params.userId;
  const s3 = new aws.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    correctClockSkew: true,
  });

  try {
    const user = await User.findOne({ where: { id: userId } });
    if (!user || !user.photo) {
      return res.status(404).json({ success: false, message: "Usuário não encontrado ou sem foto" });
    }

    const photoUrl = user.photo;
    let key;
    try {
      const url = new URL(photoUrl);
      key = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
    } catch (err) {
      return res.status(400).json({ success: false, message: "URL da foto inválida" });
    }

    await s3.deleteObject({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    }).promise();

    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
