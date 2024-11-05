const { UserFollows } = require("../models");

class UserFollowsServices {
  async getAll(req, res) {
    try {
      const UserFollowsServices = await UserFollows.findAll();
      res.status(200).json(UserFollowsServices);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erro ao buscar UserFollowsServices", error: error.message });
    }
  }

  async getById(req, res) {
    try {
      const { user_id, user_main_grid_id } = req.params;
      const UserFollowsServices = await UserFollows.findOne({
        where: { user_id, user_main_grid_id }
      });

      if (!UserFollowsServices) {
        return res.status(404).json({ message: "UserFollows não encontrada" });
      }

      res.status(200).json(UserFollowsServices);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erro ao buscar UserFollows", error: error.message });
    }
  }

  async create(req, res) {
    try {
      const UserFollowsServices = await UserFollows.create(req.body);
      res.status(201).json(UserFollowsServices);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erro ao criar UserFollowsServices", error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const { user_id, user_main_grid_id } = req.params;
      const UserFollowsServices = await UserFollows.findOne({
        where: { user_id, user_main_grid_id }
      });

      if (!UserFollowsServices) {
        return res.status(404).json({ message: "UserFollows não encontrada" });
      }

      await UserFollowsServices.destroy();

      res.status(200).json({ message: "UserFollows excluída com sucesso" });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erro ao excluir UserFollows", error: error.message });
    }
  }
}

module.exports = new UserFollowsServices();
