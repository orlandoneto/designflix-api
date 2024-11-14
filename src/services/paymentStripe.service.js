const stripe = require("../config/stripe");
const { sendEmail } = require("../utils/emailService");
const { UserPlans, Plans, User } = require("../models");

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
        res.status(400).send({ message: "Erro ao criar ou atualizar plano" });
        return;
      }

      this.handleSendEmail(email);
      res.status(200).json(subscription);
    } catch (error) {
      console.log(error);
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
            attributes: [
              "id",
              "plan_name",
              "count_downloads",
            ],
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
        return_url: "http://localhost:5173/profile",
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
            attributes: [
              "count_downloads",
              "updatedAt",
            ],
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

  handleWebhook(req, res) {
    const sig = req.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      console.error("Erro ao crair hook:", error);
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }

    const paymentIntent = event.data.object;

    switch (event.type) {
      case "invoice.payment_succeeded":
        this.handlePaymentSucceeded(paymentIntent);
        break;
      case "invoice.payment_failed":
        this.handlePaymentFailed(paymentIntent);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  }

  handlePaymentSucceeded(paymentIntent) {
    console.log("Payment succeeded", paymentIntent);
  }

  handlePaymentFailed(paymentIntent) {
    console.log("Payment failed", paymentIntent);
  }

  handleSendEmail(email) {
    const paramsEmail = {
      email: email,
      name: email.replace(/^[^@]+/, "") || "DesignFlix",
      title: "DesignFlix - Assinatura concluída",
      description: `<p>Sua Assinatura esta: <strong>concluída</strong></p>`,
    };

    const context = {
      name: "DesignFlix",
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
