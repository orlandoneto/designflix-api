const { UserFileRatings, UserMainGrid, sequelize } = require('../models');
const { ok, badRequest, notFound, serverError } = require('../utils/httpResponse');

function parsePositiveId(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

function parseScore(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
}

function roundAverage(avg) {
  if (avg == null || Number.isNaN(Number(avg))) return 0;
  return Math.round(Number(avg) * 10) / 10;
}

/**
 * Agregado público da nota de um arquivo.
 * @returns {{ average_rating: number, ratings_count: number }}
 */
async function getRatingSummary(userMainGridId) {
  const row = await UserFileRatings.findOne({
    attributes: [
      [sequelize.fn('AVG', sequelize.col('score')), 'average_rating'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'ratings_count'],
    ],
    where: { user_main_grid_id: userMainGridId },
    raw: true,
  });

  const count = Number(row?.ratings_count || 0);
  return {
    average_rating: count > 0 ? roundAverage(row.average_rating) : 0,
    ratings_count: count,
  };
}

class RatingsService {
  /**
   * POST /user/ratings — upsert da nota do usuário autenticado.
   * Body: { user_main_grid_id, score } (1–5).
   * user_id vem do JWT (req.params.userId).
   */
  async upsert(req, res) {
    try {
      const userId = parsePositiveId(req.params.userId);
      const gridId = parsePositiveId(req.body?.user_main_grid_id);
      const score = parseScore(req.body?.score);

      if (!userId) {
        return badRequest(res, 'Usuário inválido');
      }
      if (!gridId) {
        return badRequest(res, 'user_main_grid_id inválido');
      }
      if (!score) {
        return badRequest(res, 'score deve ser um inteiro de 1 a 5');
      }

      const file = await UserMainGrid.findOne({
        where: { id: gridId, activite: 0 },
        attributes: ['id'],
      });
      if (!file) {
        return notFound(res, 'Arquivo não encontrado');
      }

      const existing = await UserFileRatings.findOne({
        where: { user_id: userId, user_main_grid_id: gridId },
      });

      let rating;
      if (existing) {
        await existing.update({ score });
        rating = existing;
      } else {
        rating = await UserFileRatings.create({
          user_id: userId,
          user_main_grid_id: gridId,
          score,
        });
      }

      const summary = await getRatingSummary(gridId);

      return ok(res, {
        message: existing ? 'Avaliação atualizada' : 'Avaliação registrada',
        data: {
          id: rating.id,
          user_id: userId,
          user_main_grid_id: gridId,
          score,
          average_rating: summary.average_rating,
          ratings_count: summary.ratings_count,
        },
      });
    } catch (error) {
      console.error('[ratings/upsert]', error.message);
      return serverError(res, 'Erro ao salvar avaliação');
    }
  }

  /**
   * GET /user/ratings/main_grid/:user_main_grid_id
   * Sempre 200 — my_rating null se ainda não avaliou.
   */
  async getMine(req, res) {
    try {
      const userId = parsePositiveId(req.params.userId);
      const gridId = parsePositiveId(req.params.user_main_grid_id);

      if (!userId || !gridId) {
        return badRequest(res, 'user_id e user_main_grid_id inválidos');
      }

      const rating = await UserFileRatings.findOne({
        where: { user_id: userId, user_main_grid_id: gridId },
      });
      const summary = await getRatingSummary(gridId);

      return ok(res, {
        message: rating ? 'Avaliação encontrada' : 'Sem avaliação do usuário',
        data: {
          my_rating: rating ? Number(rating.score) : null,
          average_rating: summary.average_rating,
          ratings_count: summary.ratings_count,
        },
      });
    } catch (error) {
      console.error('[ratings/getMine]', error.message);
      return serverError(res, 'Erro ao consultar avaliação');
    }
  }
}

module.exports = new RatingsService();
module.exports.getRatingSummary = getRatingSummary;
module.exports.parseScore = parseScore;
module.exports.roundAverage = roundAverage;
