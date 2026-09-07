const { UserFavorites, UserMainGrid } = require('../models');
const { ok, badRequest, serverError } = require('../utils/httpResponse');
const {
  GRID_LIST_ATTRIBUTES,
  mapLibraryGridItem,
} = require('./library/map-library-grid-item');

class UserFavoritesServices {
  async getAll(req, res) {
    try {
      const userId = Number(req.params.userId);
      if (!userId) {
        return badRequest(res, 'Usuário inválido');
      }

      const rows = await UserFavorites.findAll({
        where: { user_id: userId },
        include: [
          {
            model: UserMainGrid,
            as: 'user_main_grid',
            attributes: GRID_LIST_ATTRIBUTES,
            required: false,
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      const data = rows
        .map((row) => {
          const plain = typeof row.toJSON === 'function' ? row.toJSON() : row;
          const item = mapLibraryGridItem(plain.user_main_grid);
          if (!item) return null;
          return {
            id: plain.id,
            user_main_grid_id: plain.user_main_grid_id,
            createdAt: plain.createdAt || plain.created_at || null,
            item,
          };
        })
        .filter(Boolean);

      return ok(res, {
        message: 'Favoritos listados',
        data,
        meta: { count: data.length },
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
