const payment = require("../config/mercadopago");
const { broadcastMessage } = require("../config/websocket");

const {
  UserPixPaymentMercadoPago,
  UserPlans,
  Plans,
  User,
} = require("../models");
const { sendEmail } = require("../utils/emailService");
const { PLAN_NAMES, PLAN_VALUES } = require("../utils/constants/constants");

module.exports = class {
  async createMercadopagoPix(req, res) {
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
        where: { stripe_price_id: req.body.planId },
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
    try {
      const userPlan = await UserPlans.findOne({ where: { user_id: userId } });
      const now = new Date();
      const planFinishAt = new Date(now);
      planFinishAt.setDate(now.getDate() + 30);

      if (userPlan) {
        const updatedPlan = await userPlan.update({
          plan_id: planId,
          mercadopago_customer_id: customerId,
          plan_finish_at: planFinishAt,
          created_at: now,
        });
        return !!updatedPlan;
      } else {
        const newPlan = await UserPlans.create({
          user_id: userId,
          plan_id: planId,
          mercadopago_customer_id: customerId,
          plan_finish_at: planFinishAt,
        });
        return !!newPlan;
      }
    } catch (error) {
      console.error("Erro ao criar/atualizar plano:", error);
      return false;
    }
  }

  async cancelTrialMercadopago(req, res) {
    try {
      const { userId } = req.params;

      const userPlan = await UserPlans.findOne({
        where: {
          user_id: userId,
        },
        include: [
          {
            model: Plans,
            as: "plans",
            attributes: ["plan_name"],
          },
          {
            model: User,
            as: "user",
            attributes: ["name", "email"],
          },
        ],
      });

      if (!userPlan) {
        console.warn(`Nenhum plano encontrado para o cliente: ${customerId}`);
        return null;
      }

      const emailTitle = "Período de teste cancelado com sucesso";
      const userName = userPlan.user?.name;
      const planName = userPlan.plans?.plan_name;
      const emailUser = userPlan.user?.email;
      if (!userName || !planName || !emailUser) {
        console.error(
          `Dados incompletos no plano ou usuário. Plano: ${planName}, Usuário: ${userName}`
        );
        return null;
      }

      await UserPlans.destroy({ where: { user_id: userId } });

      const emailTemplate = "chargeRefund";
      const paramsEmail = {
        email: emailUser,
        name: userName,
        title: emailTitle,
        description: emailTitle,
      };

      const contextParams = {
        name: userName,
        planName: PLAN_NAMES?.[planName] || planName,
        amount: PLAN_VALUES?.[planName] || planName,
        refundDate:
          new Date().toLocaleDateString("pt-BR") ||
          new Date().toLocaleDateString("pt-BR"),
        baseUrl: process.env.API_URL,
      };

      this.handleRefudedOrCanceledSendEmail(
        paramsEmail,
        emailTemplate,
        contextParams
      );

      res.status(200).json({
        message: "Período de teste cancelado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao cancelar o período de teste:", error);
      res.status(500).json({
        message: "Erro ao cancelar o período de teste",
        error: error.message,
      });
    }
  }

  async mercadopagoPixPaymentWebhook(req, res) {
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

      const userPlans = await UserPlans.findAll({
        where: {
          mercadopago_customer_id: user_id,
        },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["name", "email"],
          },
          {
            model: Plans,
            as: "plans",
            attributes: ["plan_name"],
          },
        ],
      });
      const plainResults = userPlans.map((instance) => instance.toJSON());

      if (!plainResults || plainResults.length === 0) {
        return res.status(404).json({
          message: "Plano não encontrado para este usuário",
        });
      }

      const paramsEmail = {
        email: plainResults[0].user.email,
        name: plainResults[0].user.name,
        title: "Bem-vindo ao FlixDesign!",
        description: `Obrigado por se tornar um assinante do FlixDesign!`,
      };

      const contextParams = {
        name: plainResults[0].user.name,
        planName:
          PLAN_NAMES?.[plainResults[0].plans.plan_name] ||
          plainResults[0].plans.plan_name,
        subscriptionDate: new Date().toLocaleDateString("pt-BR"),
        baseUrl: process.env.API_URL,
      };

      this.handleRefudedOrCanceledSendEmail(
        paramsEmail,
        "customerSubscriptionCreated",
        contextParams
      );

      const message = {
        userId: user_id,
        paymentId: id,
        planName: plainResults[0].plans.plan_name,
        email: plainResults[0].user.email,
        subscriptionDate: new Date().toLocaleDateString("pt-BR"),
      };

      broadcastMessage(JSON.stringify(message));

      res.status(200).json({ data: newPayment });
    } catch (error) {
      console.error("Erro ao processar pagamento PIX:", error);
      res.status(500).json({
        error_message: "Erro ao salvar pagamento pix no banco de dados.",
      });
    }
  }

  handleRefudedOrCanceledSendEmail(paramsEmail, template, context) {
    sendEmail(paramsEmail, template, context)
      .then((response) => {
        console.log("Email enviado com sucesso:", response);
      })
      .catch((error) => {
        console.error("Erro ao enviar email:", error);
      });
  }
};
