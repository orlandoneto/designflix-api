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

  async getAllUploads(req, res) {
    try {
      const uploads = await UserUploads.findAll();
      res.status(200).json({
        message: "Uploads recuperados com sucesso",
        data: uploads,
      });
    } catch (error) {
      res.status(500).json({
        message: "Erro ao recuperar uploads",
        error: error.message,
      });
    }
  }

  async getUploadsByUserId(req, res) {
    try {
      const { userId } = req.params;
      const uploads = await UserUploads.findAll({ where: { user_id: userId } });
      if (uploads.length === 0) {
        return res.status(404).json({
          message: "Nenhum total upload encontrado para este usuário",
        });
      }
      res.status(200).json({
        message: "Uploads recuperados com sucesso",
        data: uploads,
      });
    } catch (error) {
      res.status(500).json({
        message: "Erro ao recuperar uploads",
        error: error.message,
      });
    }
  }
}

module.exports = new UserUploadsServices();
