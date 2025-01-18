const stripe = require("../config/stripe");
const { sendEmail } = require("../utils/emailService");
const { UserPlans, Plans, User } = require("../models");

const planNames = {
  free: "Gratuito",
  monthly: "Mensal",
  semi_annual: "Semestral",
  annual: "Anual",
};

module.exports = class {
  async createSubscription(req, res) {
    try {
      const { userId, planId, email, paymentMethodId } = req.body;
      const customer = await stripe.customers.create({
        email,
        payment_method: paymentMethodId,
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id,
      });

      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ plan: planId }],
        expand: ["latest_invoice.payment_intent"],
      });

      const plan = await Plans.findOne({
        where: { stripe_plan_id: planId },
      });

      if (!plan) {
        return res.status(404).send("Plano não encontrado");
      }

      const userPlan = await this.createOrUpdatePlan(plan, customer, userId);
      if (!userPlan) {
        res.status(400).send({
          message: "Erro ao criar ou atualizar plano via cartão - stripe",
        });
        return;
      }

      const title = `FlixDesign - Assinatura do plano ${
        planNames[plan?.plan_name] || plan?.plan_name
      } concluída`;
      const description = `<p>Sua Assinatura esta: <strong>concluída</strong></p>`;
      this.handleSendEmail(email, title, description);
      res.status(200).json(subscription);
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: error.message,
      });
    }
  }

  async createOrUpdatePlan(plan, customer, userId) {
    const userPlan = await UserPlans.findOne({ where: { user_id: userId } });
    if (userPlan) {
      const updateUserPlan = await userPlan.update({
        plan_id: plan.id,
        stripe_customer_id: customer.id,
      });
      if (updateUserPlan) return true;
    } else {
      const createUserPlan = await UserPlans.create({
        user_id: userId,
        plan_id: plan.id,
        stripe_customer_id: customer.id,
      });
      if (createUserPlan) return true;
    }

    return false;
  }

  async retrievePlans(req, res) {
    const { planId } = req.params;
    try {
      const plan = await stripe.plans.retrieve(planId);
      res.json(plan);
    } catch (error) {
      console.error("Erro ao recuperar plano:", error);
      res
        .status(500)
        .send({ error: "Falha ao recuperar os planos do usuário" });
    }
  }

  async getAllPlans(req, res) {
    try {
      const plans = await Plans.findAll({
        where: {
          type_plans: process.env.STRIPE_TYPE_PLAN_ID,
        },
      });

      if (!plans) {
        return res.status(404).send("Plano não encontrado");
      }

      res.status(200).send({ data: plans });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }

  // FIXME: Analisar trocar getUserPlans por userPlan
  async getUserPlans(req, res) {
    const { id } = req.params;

    try {
      const userPlans = await UserPlans.findAll({
        where: {
          user_id: id,
        },
        include: [
          {
            model: Plans,
            as: "plans",
            attributes: ["id", "plan_name", "count_downloads"],
          },
          {
            model: User,
            as: "user",
            attributes: ["id", "contributor"],
          },
        ],
      });

      res.status(200).send({ data: userPlans });
    } catch (error) {
      console.error("Erro ao buscar planos do usuário:", error);
      throw error;
    }
  }

  // FIXME: adicioanr esse metodo no UserPlans service
  async userPlan(req, res) {
    const userId = req.query.userId;

    try {
      const userPlan = await UserPlans.findOne({
        where: { user_id: userId },
      });

      if (!userPlan) {
        return res.status(404).send("Usuário não encontrado");
      }

      res.status(200).send({ data: userPlan });
    } catch (error) {
      console.error("Erro ao retornar o plano:", error);
      res.status(500).send(`Erro ao retornar o plano: ${error.message}`);
    }
  }

  async userPlansPortalSession(req, res) {
    const stripe_customer_id = req.query.stripe_customer_id;

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: stripe_customer_id,
        return_url: process.env.STRIPE_URL_PORTAL,
      });

      res.status(200).send({ url: session.url });
    } catch (error) {
      res
        .status(400)
        .send(`Erro ao criar a sessão do Portal: ${error.message}`);
    }
  }

  async getUserPlanDownloads(req, res) {
    const { userId } = req.params;

    try {
      const userPlan = await UserPlans.findOne({
        where: { user_id: userId },
        include: [
          {
            model: Plans,
            as: "plans",
            attributes: ["count_downloads", "updatedAt"],
          },
        ],
      });

      if (!userPlan) {
        return res
          .status(404)
          .send({ error: "Plano do usuário não encontrado" });
      }

      res.status(200).send({
        data: {
          count_downloads: userPlan.plans.count_downloads,
          updated_at: userPlan.plans.updatedAt,
        },
      });
    } catch (error) {
      console.error("Erro ao buscar os downloads do plano do usuário:", error);
      res
        .status(500)
        .send({ error: "Erro ao buscar os downloads do plano do usuário" });
    }
  }

  async handleWebhook(req, res) {
    //console.log("Webhook recebido:", JSON.stringify(req.body, null, 2));

    const eventType = req.body.type; // Tipo do evento recebido
    const eventData = req.body.data.object; // Dados do evento
    switch (eventType) {
      case "invoice.payment_succeeded":
        // console.log("Pagamento da fatura concluído:", eventData);
        break;

      case "invoice.payment_failed":
        // console.log("Pagamento da fatura falhou:", eventData);
        break;

      case "customer.subscription.deleted":
        // console.log("Assinatura cancelada:", eventData);
        break;

      case "customer.subscription.updated":
        // console.log("Assinatura atualizada:", eventData);
        break;

      case "customer.created":
        // console.log("Novo cliente criado:", eventData);
        break;

      case "customer.updated":
        // console.log("Dados do cliente atualizados:", eventData);
        break;

      case "invoice.finalized":
        // console.log("Fatura finalizada:", eventData);
        break;

      case "charge.refunded": // Evento de reembolso
        // console.log("Pagamento reembolsado:", eventData);
        this.handleRefund(eventData); // Chame um método separado para lidar com reembolsos, se necessário
        break;

      default:
        console.log(`Evento não tratado: ${eventType}`);
    }

    res.json({ received: true });
  }

  async handleRefund(refundData) {
    try {
      if (
        !refundData ||
        !refundData.customer ||
        !refundData.billing_details?.email ||
        !refundData.amount
      ) {
        throw new Error("Dados de reembolso inválidos ou incompletos.");
      }

      const customerId = refundData.customer; // ID do cliente no Stripe
      const emailUser = refundData.billing_details.email; // E-mail do usuário
      const amountRefunded = refundData.amount / 100; // Valor reembolsado (em unidades monetárias)

      const userPlan = await UserPlans.findOne({
        where: { stripe_customer_id: customerId },
      });

      if (!userPlan) {
        console.warn(`Nenhum plano encontrado para o cliente: ${customerId}`);
        return null;
      }

      const destroyUserPlan = await userPlan.destroy();
      if (destroyUserPlan) {
        const paramsEmail = {
          email: emailUser,
          name: emailUser.split("@")[0],
          title: "Reembolso de plano",
          description: "Reembolso de plano",
        };

        const contextParams = {
          amount: amountRefunded.toFixed(2),
          refundDate: new Date().toLocaleDateString("pt-BR"),
          baseUrl: process.env.API_URL,
        };

        this.handleRefundPlanSendEmail(paramsEmail, contextParams);

        return userPlan;
      }

      console.error("Erro ao excluir o plano do usuário.");
      return null;
    } catch (error) {
      console.error("Erro ao processar reembolso:", error.message);
      console.error(error);
    }
  }
  // EVENTOS HOOKS

  handleRefundPlanSendEmail(paramsEmail, context) {
    sendEmail(paramsEmail, "refundPlan", context)
      .then((response) => {
        console.log("Email enviado com sucesso:", response);
      })
      .catch((error) => {
        console.error("Erro ao enviar email:", error);
      });
  }

  handleSendEmail(email, title, description) {
    const paramsEmail = {
      email: email,
      name: email.replace(/^[^@]+/, "") || "FlixDesign",
      title: title,
      description: description,
    };

    const context = {
      name: "FlixDesign",
      baseUrl: process.env.API_URL,
    };

    sendEmail(paramsEmail, "index", context)
      .then((response) => {
        console.log("Email enviado com sucesso:", response);
      })
      .catch((error) => {
        console.error("Erro ao enviar email:", error);
      });
  }
};
