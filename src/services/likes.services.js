const { UserLikes } = require('../models');
const { ok, badRequest, serverError } = require('../utils/httpResponse');

class UserLikesServices {
  /**
   * GET status — sempre 200 com liked true|false (nunca 404 por “não curtiu”).
   */
  async getById(req, res) {
    try {
      const userId = Number(req.params.user_id);
      const gridId = Number(req.params.user_main_grid_id);
      if (!userId || !gridId) {
        return badRequest(res, 'user_id e user_main_grid_id inválidos');
      }

      const like = await UserLikes.findOne({
        where: { user_id: userId, user_main_grid_id: gridId },
      });

      return ok(res, {
        message: like ? 'Item curtido' : 'Item não curtido',
        data: {
          liked: Boolean(like),
          like: like || null,
        },
      });
    } catch (error) {
      console.error('[likes/getById]', error.message);
      return serverError(res, 'Erro ao consultar curtida');
    }
  }

  async create(req, res) {
    try {
      const userId = Number(req.body?.user_id ?? req.params.userId);
      const gridId = Number(req.body?.user_main_grid_id);
      if (!userId || !gridId) {
        return badRequest(res, 'user_id e user_main_grid_id são obrigatórios');
      }

      const existing = await UserLikes.findOne({
        where: { user_id: userId, user_main_grid_id: gridId },
      });
      if (existing) {
        return ok(res, {
          message: 'Já curtido',
          data: existing,
        });
      }

      const created = await UserLikes.create({
        user_id: userId,
        user_main_grid_id: gridId,
      });
      return ok(res, {
        message: 'Curtida adicionada',
        data: created,
      });
    } catch (error) {
      console.error('[likes/create]', error.message);
      return serverError(res, 'Erro ao curtir');
    }
  }

  async delete(req, res) {
    try {
      const userId = Number(req.params.user_id);
      const gridId = Number(req.params.user_main_grid_id);
      if (!userId || !gridId) {
        return badRequest(res, 'user_id e user_main_grid_id inválidos');
      }

      const like = await UserLikes.findOne({
        where: { user_id: userId, user_main_grid_id: gridId },
      });

      if (!like) {
        return ok(res, {
          message: 'Curtida já removida',
          data: { removed: false },
        });
      }

      await like.destroy();
      return ok(res, {
        message: 'Curtida removida',
        data: { removed: true },
      });
    } catch (error) {
      console.error('[likes/delete]', error.message);
      return serverError(res, 'Erro ao remover curtida');
    }
  }
}

module.exports = new UserLikesServices();
