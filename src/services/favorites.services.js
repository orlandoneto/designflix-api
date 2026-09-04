const { UserFavorites } = require('../models');
const { ok, badRequest, serverError } = require('../utils/httpResponse');

class UserFavoritesServices {
  async getAll(req, res) {
    try {
      const rows = await UserFavorites.findAll();
      return ok(res, {
        message: 'Favoritos listados',
        data: rows,
      });
    } catch (error) {
      console.error('[favorites/getAll]', error.message);
      return serverError(res, 'Erro ao listar favoritos');
    }
  }

  /**
   * Consulta se o item está favoritado.
   * Sempre 200: { favorited: true|false } — nunca 404 só por “não favoritou”.
   */
  async getById(req, res) {
    try {
      const userId = Number(req.params.user_id);
      const gridId = Number(req.params.user_main_grid_id);
      if (!userId || !gridId) {
        return badRequest(res, 'user_id e user_main_grid_id inválidos');
      }

      const favorite = await UserFavorites.findOne({
        where: { user_id: userId, user_main_grid_id: gridId },
      });

      return ok(res, {
        message: favorite ? 'Item favoritado' : 'Item não favoritado',
        data: {
          favorited: Boolean(favorite),
          favorite: favorite || null,
        },
      });
    } catch (error) {
      console.error('[favorites/getById]', error.message);
      return serverError(res, 'Erro ao consultar favorito');
    }
  }

  async create(req, res) {
    try {
      const created = await UserFavorites.create(req.body);
      return ok(res, {
        message: 'Favorito adicionado',
        data: created,
      });
    } catch (error) {
      console.error('[favorites/create]', error.message);
      return serverError(res, 'Erro ao criar favorito');
    }
  }

  async delete(req, res) {
    try {
      const userId = Number(req.params.user_id);
      const gridId = Number(req.params.user_main_grid_id);
      if (!userId || !gridId) {
        return badRequest(res, 'user_id e user_main_grid_id inválidos');
      }

      const favorite = await UserFavorites.findOne({
        where: { user_id: userId, user_main_grid_id: gridId },
      });

      if (!favorite) {
        // Idempotente: já não está favoritado
        return ok(res, {
          message: 'Favorito já removido',
          data: { removed: false },
        });
      }

      await favorite.destroy();
      return ok(res, {
        message: 'Favorito removido',
        data: { removed: true },
      });
    } catch (error) {
      console.error('[favorites/delete]', error.message);
      return serverError(res, 'Erro ao remover favorito');
    }
  }
}

module.exports = new UserFavoritesServices();
