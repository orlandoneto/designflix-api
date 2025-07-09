const { UserCommission, User, Sequelize } = require("../models");
const { PALN_COMMISSION } = require("../utils/constants/constants");

class UserCommissionsServices {
  // FIXME: Criar um service único que reunina todos os metodo da carteira.

  async commissionsUserById(req, res) {
    const { userId } = req.params;

    try {
      // Obtém o saldo disponível do usuário
      const user = await User.findOne({
        where: { id: userId },
        attributes: ["balance"],
      });

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "Usuário não encontrado." });
      }

      const availableBalance = user.balance >= 100 ? user.balance : 0; // Saldo disponível (mínimo de R$ 100,00)

      // Obtém as comissões de hoje
      const todayCommissions = await UserCommission.findOne({
        where: {
          user_id: userId,
          created_at: {
            [Sequelize.Op.gte]: Sequelize.literal("CURDATE()"),
          },
        },
        attributes: [
          [Sequelize.fn("SUM", Sequelize.col("amount")), "total"],
          [Sequelize.fn("COUNT", Sequelize.col("*")), "downloads"],
        ],
        raw: true,
      });

      // Obtém as comissões dos últimos 7 dias
      const last7DaysCommissions = await UserCommission.findOne({
        where: {
          user_id: userId,
          created_at: {
            [Sequelize.Op.gte]: Sequelize.literal("DATE_SUB(CURDATE(), INTERVAL 7 DAY)"),
          },
        },
        attributes: [
          [Sequelize.fn("SUM", Sequelize.col("amount")), "total"],
          [Sequelize.fn("COUNT", Sequelize.col("*")), "downloads"],
        ],
        raw: true,
      });

      // Obtém as comissões dos últimos 30 dias
      const last30DaysCommissions = await UserCommission.findOne({
        where: {
          user_id: userId,
          created_at: {
            [Sequelize.Op.gte]: Sequelize.literal("DATE_SUB(CURDATE(), INTERVAL 30 DAY)"),
          },
        },
        attributes: [
          [Sequelize.fn("SUM", Sequelize.col("amount")), "total"],
          [Sequelize.fn("COUNT", Sequelize.col("*")), "downloads"],
        ],
        raw: true,
      });

      // Resposta formatada
      const response = {
        today: {
          total: parseFloat(todayCommissions.total) || 0,
          downloads: parseInt(todayCommissions.downloads) || 0,
        },
        last7Days: {
          total: parseFloat(last7DaysCommissions.total) || 0,
          downloads: parseInt(last7DaysCommissions.downloads) || 0,
        },
        last30Days: {
          total: parseFloat(last30DaysCommissions.total) || 0,
          downloads: parseInt(last30DaysCommissions.downloads) || 0,
        },
        availableBalance: parseFloat(availableBalance),
      };

      res.status(200).json({ success: true, data: response });
    } catch (error) {
      console.error("Erro ao buscar comissões:", error);
      res
        .status(500)
        .json({ success: false, message: "Erro ao buscar comissões." });
    }
  }

  async createCommissionUser(req, res) {
    const { userId } = req.params;
    try {
      const result = await this._createCommission(userId);
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Erro ao criar a comissão",
        error: error.message,
      });
    }
  }

  async _createCommission(userId) {
    try {
      const commission = await UserCommission.create({
        user_id: userId,
        amount: PALN_COMMISSION.comission_contributor / 100, // Converte centavos para reais
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
