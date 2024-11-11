const { UserUploads } = require("../models");

class UserUploadsServices {
  async incrementUploads(req, res) {
    try {
      const { userId } = req.params;

      const [userUpload, created] = await UserUploads.findOrCreate({
        where: { user_id: userId },
        defaults: {
          user_id: userId,
          total_uploads: 1,
        },
      });

      if (!created) {
        userUpload.total_uploads += 1;
        await userUpload.save();
      }

      res.status(200).json({
        message: "Total de uploads incrementado com sucesso",
        total_uploads: userUpload.total_uploads,
      });
    } catch (error) {
      res.status(500).json({
        message: "Erro ao incrementar total de uploads",
        error: error.message,
      });
    }
  }
}

module.exports = new UserUploadsServices();
