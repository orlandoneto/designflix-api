const LocalObjectStore = require("../utils/localObjectStore");
const { User } = require("../models");

/** Cópia local do removeAvatar (STORAGE_TYPE=local). */
module.exports = async function removeAvatarLocal(req, res, next) {
  const userId = req.params.userId;
  if (!userId) return next();

  try {
    const user = await User.findOne({ where: { id: userId } });
    if (!user || !user.photo) return next();
    await LocalObjectStore.deleteByUrl(user.photo);
    next();
  } catch (err) {
    console.error("Erro ao remover avatar local:", err);
    next();
  }
};
