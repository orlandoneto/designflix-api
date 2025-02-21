const { UserCommission } = require("../models");

class UserCommissionsServices {
  async createCommission(req, res) {
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
        amount: 0.3,
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
