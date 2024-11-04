const { UserFavorites } = require("../models");

class UserFavoritesServices {
  // Buscar todas as UserFavoritesServices
  async getAll(req, res) {
    try {
      const userFavoritesServices = await UserFavorites.findAll();
      res.status(200).json(userFavoritesServices);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erro ao buscar UserFavoritesServices", error: error.message });
    }
  }

  // Buscar uma UserFavoritesServices por user_id e user_main_grid_id
  async getById(req, res) {
    try {
      const { user_id, user_main_grid_id } = req.params;
      const userFavoritesServices = await UserFavorites.findOne({
        where: { user_id, user_main_grid_id }
      });

      if (!userFavoritesServices) {
        return res.status(404).json({ message: "UserFavorites não encontrada" });
      }

      res.status(200).json(userFavoritesServices);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erro ao buscar UserFavorites", error: error.message });
    }
  }

  // Criar uma nova UserFavoritesServices
  async create(req, res) {
    try {
      const userFavoritesServices = await UserFavorites.create(req.body);
      res.status(201).json(userFavoritesServices);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erro ao criar UserFavoritesServices", error: error.message });
    }
  }

  // Excluir uma UserFavoritesServices por user_id e user_main_grid_id
  async delete(req, res) {
    try {
      const { user_id, user_main_grid_id } = req.params;
      const userFavoritesServices = await UserFavorites.findOne({
        where: { user_id, user_main_grid_id }
      });

      if (!userFavoritesServices) {
        return res.status(404).json({ message: "UserFavorites não encontrada" });
      }

      await userFavoritesServices.destroy();

      res.status(200).json({ message: "UserFavorites excluída com sucesso" });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erro ao excluir UserFavorites", error: error.message });
    }
  }
}

module.exports = new UserFavoritesServices();
