/**
 * Comissões do colaborador — R$ 0,30 por download de arquivo dele.
 *
 * A matemática fica em `contributor/contributor-earnings-rules.js`; aqui só
 * consulta e envelope.
 *
 * @see docs/contextos/colaborador-ganhos.md
 */

const { UserCommission, User, Sequelize } = require("../models");
const { PALN_COMMISSION } = require("../utils/constants/constants");
const { ok, badRequest, notFound, serverError } = require("../utils/httpResponse");
const {
  buildCommissionsSummary,
  shouldCreditCommission,
  commissionPerDownloadReais,
} = require("./contributor/contributor-earnings-rules");

/** Agregado `SUM(amount)` + `COUNT(*)` desde um marco no tempo. */
const PERIOD_ATTRIBUTES = [
  [Sequelize.fn("SUM", Sequelize.col("amount")), "total"],
  [Sequelize.fn("COUNT", Sequelize.col("*")), "downloads"],
];

function sinceLiteral(expression) {
  return Sequelize.literal(expression);
}

class UserCommissionsServices {
  /** GET /user-commissions/:userId */
  async commissionsUserById(req, res) {
    const userId = Number(req.params && req.params.userId);
    if (!Number.isInteger(userId) || userId < 1) {
      return badRequest(res, "Usuário inválido");
    }

    try {
      const user = await User.findOne({
        where: { id: userId },
        attributes: ["balance"],
      });

      if (!user) {
        return notFound(res, "Usuário não encontrado");
      }

      const periodFor = (expression) =>
        UserCommission.findOne({
          where: {
            user_id: userId,
            created_at: { [Sequelize.Op.gte]: sinceLiteral(expression) },
          },
          attributes: PERIOD_ATTRIBUTES,
          raw: true,
        });

      const [
        todayRow,
        last7DaysRow,
        last30DaysRow,
        totalGeneralRow,
        recentCommissions,
      ] = await Promise.all([
        periodFor("CURDATE()"),
        periodFor("DATE_SUB(CURDATE(), INTERVAL 7 DAY)"),
        periodFor("DATE_SUB(CURDATE(), INTERVAL 30 DAY)"),
        UserCommission.findOne({
          where: { user_id: userId },
          attributes: [[Sequelize.fn("SUM", Sequelize.col("amount")), "total"]],
          raw: true,
        }),
        UserCommission.findAll({
          where: {
            user_id: userId,
            created_at: {
              [Sequelize.Op.gte]: sinceLiteral(
                "DATE_SUB(CURDATE(), INTERVAL 30 DAY)"
              ),
            },
          },
          attributes: ["amount", "created_at"],
          order: [["created_at", "DESC"]],
          raw: true,
        }),
      ]);

      const data = buildCommissionsSummary({
        balance: user.balance,
        todayRow,
        last7DaysRow,
        last30DaysRow,
        totalGeneralRow,
        recentCommissions,
      });

      return ok(res, { message: "Ganhos do colaborador", data });
    } catch (error) {
      console.error("Erro ao buscar comissões:", error);
      return serverError(res, "Erro ao buscar comissões");
    }
  }

  /** POST /user-commissions/create/:userId */
  async createCommissionUser(req, res) {
    const userId = Number(req.params && req.params.userId);
    if (!Number.isInteger(userId) || userId < 1) {
      return badRequest(res, "Usuário inválido");
    }

    try {
      const result = await this._createCommission(userId);
      if (!result.success) {
        return serverError(res, result.message);
      }
      return ok(res, { message: result.message, data: result.data });
    } catch (error) {
      console.error("Erro ao criar a comissão:", error);
      return serverError(res, "Erro ao criar a comissão");
    }
  }

  /**
   * Registra uma comissão para o dono do arquivo.
   *
   * `status: pending` = ainda não saiu em saque. Quem quita é o fluxo de
   * payout, não este método.
   */
  async _createCommission(userId, options = {}) {
    const guard = shouldCreditCommission({
      downloaderUserId: options.downloaderUserId,
      contributorUserId: userId,
    });
    if (!guard.credit) {
      return { success: false, skipped: true, message: guard.reason };
    }

    try {
      const commission = await UserCommission.create({
        user_id: Number(userId),
        amount: commissionPerDownloadReais(),
        created_at: new Date(),
        status: "pending",
      });

      return {
        success: true,
        message: "Comissão criada com sucesso",
        data: commission,
      };
    } catch (error) {
      return {
        success: false,
        message: "Erro ao criar a comissão",
        error: error.message,
      };
    }
  }
}

module.exports = new UserCommissionsServices();
module.exports.PAYOUT_MINIMUM_CENTS = PALN_COMMISSION.payout_contributor;
