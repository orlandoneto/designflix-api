const { UserPlans } = require("../models");

class UserPlansServices {
  async planIsOutOfTime(req, res) {
    try {
      const { userId } = req.params;

      const userPlan = await UserPlans.findOne({ where: { user_id: userId } });

      if (!userPlan) {
        return res.status(404).json({
          message: "Plano não encontrado para este usuário",
        });
      }

      const createdAt = new Date(userPlan.createdAt);
      const currentDate = new Date();
      const diffTime = Math.abs(currentDate - createdAt);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const isWithin7Days = diffDays <= 7;

      res.status(200).json({
        message: "Verificação de tempo do plano realizada com sucesso",
        isWithin7Days: isWithin7Days,
      });
    } catch (error) {
      res.status(500).json({
        message: "Erro ao verificar o tempo do plano",
        error: error.message,
      });
    }
  }

  async getActivePlan(req, res) {
    try {
      const { userId } = req.params;

      const userPlan = await UserPlans.findOne({ where: { user_id: userId } });

      if (!userPlan) {
        return res.status(404).json({
          message: "Plano não encontrado para este usuário",
        });
      }

      let currentPlan;
      if (userPlan.stripe_customer_id) {
        currentPlan = {
          provider: "Stripe",
          customerId: userPlan.stripe_customer_id,
        };
      } else if (userPlan.mercadopago_customer_id) {
        currentPlan = {
          provider: "MercadoPago",
          customerId: userPlan.mercadopago_customer_id,
        };
      } else {
        return res.status(404).json({
          message: "Nenhum plano ativo encontrado para este usuário",
        });
      }

      res.status(200).json({
        message: "Plano atual recuperado com sucesso",
        currentPlan: currentPlan,
      });
    } catch (error) {
      res.status(500).json({
        message: "Erro ao recuperar o plano atual",
        error: error.message,
      });
    }
  }
}

module.exports = new UserPlansServices();
