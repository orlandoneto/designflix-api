const { UserDownloads, UserFavorites } = require('../models');
const { ok, badRequest, serverError } = require('../utils/httpResponse');

/**
 * Contadores do dash da conta (Meu Perfil).
 * JWT → req.params.userId
 */
class AccountStatsServices {
  async getMine(req, res) {
    try {
      const userId = Number(req.params.userId);
      if (!userId) {
        return badRequest(res, 'Usuário inválido');
      }

      const [downloadRows, savedCount] = await Promise.all([
        UserDownloads.findAll({
          where: { user_id: userId },
          attributes: ['total_downloads'],
        }),
        UserFavorites.count({ where: { user_id: userId } }),
      ]);

      const downloads = downloadRows.reduce(
        (sum, row) => sum + Number(row.total_downloads || 0),
        0
      );

      return ok(res, {
        message: 'Estatísticas da conta',
        data: {
          downloads,
          saved: Number(savedCount) || 0,
        },
      });
    } catch (error) {
      console.error('[account-stats/getMine]', error.message);
      return serverError(res, 'Erro ao carregar estatísticas da conta');
    }
  }
}

module.exports = new AccountStatsServices();
