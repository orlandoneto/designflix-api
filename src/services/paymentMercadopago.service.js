const payment = require("../config/mercadopago");
const { UserPixPaymentMercadoPago, UserPlans, Plans } = require("../models");

module.exports = class {
  async createPix(req, res) {
    const body = {
      transaction_amount: req.body.transaction_amount,
      description: req.body.description,
      payment_method_id: "pix",
      payer: {
        email: req.body.payer?.email,
      },
      notification_url: process.env.MERCADOPAGO_WEB_HOOK,
    };

    payment
      .create({ body })
      .then((response) => {
        res
          .status(201)
          .json({ data: response, collector_id: response?.collector_id });
      })
      .catch((error) => {
        console.error("Erro ao criar transação PIX:", error);
        const errorStatus = error.status || 500;
        const errorMessage = error.message || "Erro ao processar transação";
        res.status(errorStatus).json({ error_message: errorMessage });
      });
  }

  async getById(req, res) {
    try {
      const { id } = req.params;

      const paymentData = await UserPixPaymentMercadoPago.findOne({
        where: { user_id: id, is_check: 0 },
      });

      if (!paymentData) {
        return res.status(200).json({ data: null });
      }

      res.status(200).json({ data: paymentData });
    } catch (error) {
      console.error("Erro ao buscar pagamento PIX:", error);
      res.status(500).json({ error_message: "Erro ao buscar pagamento pix." });
    }
  }

  async updateById(req, res) {
    try {
      const { id } = req.params;
      if (!id) {
        return res
          .status(400)
          .json({ error_message: "ID do usuário é obrigatório" });
      }

      const paymentData = await UserPixPaymentMercadoPago.findOne({
        where: { userPixId: id, auto_id: req.body.auto_id },
      });

      if (!paymentData) {
        return res
          .status(404)
          .json({ error_message: "Pagamento não encontrado" });
      }

      paymentData.isCheck = 1;

      const updatedPaymentData = await paymentData.save();

      const plan = await Plans.findOne({
        where: { stripe_plan_id: req.body.planId },
      });

      if (!plan) {
        return res.status(404).send("Plano não encontrado");
      }

      const userPlan = await this.createOrUpdatePlan(
        plan.id,
        id,
        req.body.userId
      );
      if (!userPlan) {
        res.status(400).send({
          message: "Erro ao criar ou atualizar plano via cartão - stripe",
        });
        return;
      }

      res.status(200).json({ data: updatedPaymentData });
    } catch (error) {
      console.error("Erro ao atualizar pagamento PIX:", error);
      res
        .status(500)
        .json({ error_message: "Erro ao atualizar pagamento PIX." });
    }
  }

  async createOrUpdatePlan(planId, customerId, userId) {
    const userPlan = await UserPlans.findOne({ where: { user_id: userId } });
    if (userPlan) {
      const updateUserPlan = await userPlan.update({
        plan_id: planId,
        mercadopago_customer_id: customerId,
      });
      if (updateUserPlan) return true;
    } else {
      const createUserPlan = await UserPlans.create({
        user_id: userId,
        plan_id: planId,
        mercadopago_customer_id: customerId,
      });
      if (createUserPlan) return true;
    }

    return false;
  }

  async processPaymentWebhook(req, res) {
    try {
      const {
        action,
        api_version,
        data,
        date_created,
        id,
        live_mode,
        type,
        user_id,
      } = req.body;

      const newPayment = await UserPixPaymentMercadoPago.create({
        id,
        action,
        apiVersion: api_version,
        dataId: data?.id,
        dateCreated: date_created,
        liveMode: live_mode,
        type,
        userPixId: user_id,
      });

      res.status(200).json({ data: newPayment });
    } catch (error) {
      console.error("Erro ao processar pagamento PIX:", error);
      res.status(500).json({
        error_message: "Erro ao salvar pagamento pix no banco de dados.",
      });
    }
  }
};
