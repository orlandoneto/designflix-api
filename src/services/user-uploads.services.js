const { UserUploads } = require("../models");

class UserUploadsServices {
  async getAll(req, res) {
    try {
      const UserUploadsServices = await UserUploads.findAll();
      res.status(200).json(UserUploadsServices);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erro ao buscar UserUploadsServices", error: error.message });
    }
  }

  async getById(req, res) {
    try {
      const { user_id, user_main_grid_id } = req.params;
      const UserUploadsServices = await UserUploads.findOne({
        where: { user_id, user_main_grid_id }
      });

      if (!UserUploadsServices) {
        return res.status(404).json({ message: "UserUploads não encontrada" });
      }

      res.status(200).json(UserUploadsServices);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erro ao buscar UserUploads", error: error.message });
    }
  }

  async create(req, res) {
    try {
      const UserUploadsServices = await UserUploads.create(req.body);
      res.status(201).json(UserUploadsServices);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erro ao criar UserUploadsServices", error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const { user_id, user_main_grid_id } = req.params;
      const UserUploadsServices = await UserUploads.findOne({
        where: { user_id, user_main_grid_id }
      });

      if (!UserUploadsServices) {
        return res.status(404).json({ message: "UserUploads não encontrada" });
      }

      await UserUploadsServices.destroy();

      res.status(200).json({ message: "UserUploads excluída com sucesso" });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erro ao excluir UserUploads", error: error.message });
    }
  }
}

module.exports = new UserUploadsServices();
