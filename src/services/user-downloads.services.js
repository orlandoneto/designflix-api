const { UserDownloads } = require("../models");

class UserDownloadsServices {
  async getAll(req, res) {
    try {
      const UserDownloadsServices = await UserDownloads.findAll();
      res.status(200).json(UserDownloadsServices);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erro ao buscar UserDownloadsServices", error: error.message });
    }
  }

  async getById(req, res) {
    try {
      const { user_id, user_main_grid_id } = req.params;
      const UserDownloadsServices = await UserDownloads.findOne({
        where: { user_id, user_main_grid_id }
      });

      if (!UserDownloadsServices) {
        return res.status(404).json({ message: "UserDownloads não encontrada" });
      }

      res.status(200).json(UserDownloadsServices);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erro ao buscar UserDownloads", error: error.message });
    }
  }

  async create(req, res) {
    try {
      const UserDownloadsServices = await UserDownloads.create(req.body);
      res.status(201).json(UserDownloadsServices);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erro ao criar UserDownloadsServices", error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const { user_id, user_main_grid_id } = req.params;
      const UserDownloadsServices = await UserDownloads.findOne({
        where: { user_id, user_main_grid_id }
      });

      if (!UserDownloadsServices) {
        return res.status(404).json({ message: "UserDownloads não encontrada" });
      }

      await UserDownloadsServices.destroy();

      res.status(200).json({ message: "UserDownloads excluída com sucesso" });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erro ao excluir UserDownloads", error: error.message });
    }
  }
}

module.exports = new UserDownloadsServices();
