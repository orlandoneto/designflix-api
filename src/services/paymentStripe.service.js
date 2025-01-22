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

  // START EVENTOS HOOKS

  async handleWebhook(req, res) {
    const eventType = req.body.type;
    const eventData = req.body.data.object;

    switch (eventType) {
      case "customer.subscription.created": // Evento de nova assinatura
        await this.handleCustomerSubscriptionCreated(
          eventData,
          "customerSubscriptionCreated",
          "Bem-vindo ao FlixDesign!"
        );
        break;

      case "customer.subscription.deleted": // Evento de cancelamento de assinatura
        await this.handleSubscriptionChangeDeleteOrRefund(
          eventData,
          "customerSubscriptionDeleted",
          "Cancelamento de plano"
        );
        break;

      case "customer.subscription.updated": // Evento de atualização de assinatura
        await this.handleSubscriptionUpdated(eventData);
        break;

      case "charge.refunded": // Evento de reembolso de assinatura
        await this.handleSubscriptionChangeDeleteOrRefund(
          eventData,
          "chargeRefund",
          "Reembolso de plano"
        );
        break;

      default:
        console.log(`Evento não tratado: ${eventType}`);
    }

    res.json({ received: true });
  }

  async handleCustomerSubscriptionCreated(data, emailTemplate, emailTitle) {
    try {
      if (!data?.plan || !data.customer) {
        throw new Error("Dados inválidos ou incompletos.");
      }

      const customerId = data.customer;
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer || !customer.email) {
        throw new Error("Não foi possível obter o e-mail do cliente.");
      }
      const emailUser = customer.email;

      const userPlan = await UserPlans.findOne({
        where: { stripe_customer_id: customerId },
        include: [
          {
            model: Plans,
            as: "plans",
            attributes: ["plan_name"],
          },
          {
            model: User,
            as: "user",
            attributes: ["name"],
          },
        ],
      });

      if (!userPlan) {
        console.warn(`Nenhum plano encontrado para o cliente: ${customerId}`);
        return null;
      }

      const userName = userPlan.user?.name || customer.name || "Cliente";
      const planName = userPlan.plans?.plan_name;
      if (!userName || !planName) {
        console.error(
          `Dados incompletos no plano ou usuário. Usuário: ${userName}`
        );
        return null;
      }

      const paramsEmail = {
        email: emailUser,
        name: userName,
        title: emailTitle,
        description: `Obrigado por se tornar um assinante do FlixDesign!`,
      };

      const contextParams = {
        name: userName,
        planName: planNames?.[planName] || planName,
        subscriptionDate: new Date().toLocaleDateString("pt-BR"),
        baseUrl: process.env.API_URL,
      };

      this.handleCreatedSendEmail(paramsEmail, emailTemplate, contextParams);
      return userPlan;
    } catch (error) {
      console.error(
        "Erro ao processar a criação da assinatura:",
        error.message
      );
      throw error;
    }
  }

  async handleSubscriptionChangeDeleteOrRefund(data, emailTemplate, emailTitle) {
    try {
      if (!data?.customer || !data.billing_details?.email) {
        throw new Error("Dados inválidos ou incompletos.");
      }

      const customerId = data.customer;
      const emailUser = data.billing_details.email;

      const userPlan = await UserPlans.findOne({
        where: { stripe_customer_id: customerId },
        include: [
          {
            model: Plans,
            as: "plans",
            attributes: ["plan_name"],
          },
          {
            model: User,
            as: "user",
            attributes: ["name"],
          },
        ],
      });

      if (!userPlan) {
        console.warn(`Nenhum plano encontrado para o cliente: ${customerId}`);
        return null;
      }

      const userName = userPlan.user?.name;
      const planName = userPlan.plans?.plan_name;
      if (!userName || !planName) {
        console.error(
          `Dados incompletos no plano ou usuário. Plano: ${planName}, Usuário: ${userName}`
        );
        return null;
      }

      await userPlan.destroy();

      const paramsEmail = {
        email: emailUser,
        name: userName,
        title: emailTitle,
        description: emailTitle, // FIXME:  Analisr se é passdo
      };

      const contextParams = {
        name: userName,
        planName: planNames?.[planName] || planName,
        amount:
          emailTemplate === "chargeRefund"
            ? (data.amount / 100).toFixed(2)
            : undefined,
        cancellationDate:
          emailTemplate === "customerSubscriptionDeleted"
            ? new Date().toLocaleDateString("pt-BR")
            : undefined,
        refundDate:
          emailTemplate === "chargeRefund"
            ? new Date().toLocaleDateString("pt-BR")
            : undefined,
        baseUrl: process.env.API_URL,
      };

      this.handleRefudedOrCanceledSendEmail(
        paramsEmail,
        emailTemplate,
        contextParams
      );
      return userPlan;
    } catch (error) {
      console.error(
        "Erro ao processar alteração na assinatura:",
        error.message
      );
      throw error;
    }
  }

  async handleSubscriptionUpdated(data) {
    try {
      if (!data?.customer) {
        throw new Error("Dados inválidos ou incompletos.");
      }

      const customerId = data.customer;
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer || !customer.email) {
        throw new Error("Não foi possível obter o e-mail do cliente.");
      }
      const emailUser = customer.email;

      const userPlan = await UserPlans.findOne({
        where: { stripe_customer_id: customerId },
        include: [
          {
            model: Plans,
            as: "plans",
            attributes: ["id", "plan_name"],
          },
          {
            model: User,
            as: "user",
            attributes: ["name"],
          },
        ],
      });

      if (!userPlan) {
        console.warn(`Nenhum plano encontrado para o cliente: ${customerId}`);
        return null;
      }

      const userName = userPlan.user?.name;
      const planName = userPlan.plans?.plan_name;
      if (!userName || !planName) {
        console.error(
          `Dados incompletos no plano ou usuário. Plano: ${planName}, Usuário: ${userName}`
        );
        return null;
      }

      let statusPlan;
      let additionalDetails = "";

      if (
        data.cancel_at_period_end &&
        data.cancellation_details?.reason === "cancellation_requested"
      ) {
        const cancelDate = new Date(data.cancel_at * 1000).toLocaleDateString(
          "pt-BR"
        );
        statusPlan = "Cancelamento solicitado";
        additionalDetails = cancelDate;
      } else if (
        !data.cancel_at_period_end &&
        !data.cancellation_details?.reason
      ) {
        statusPlan = "Plano ativo";
      } else {
        statusPlan = "Status indefinido";
      }

      const paramsEmail = {
        email: emailUser,
        name: userName,
        title: "Assinatura atualizada",
      };

      const contextParams = {
        name: userName,
        planName: planNames?.[planName] || planName,
        statusPlan,
        additionalDetails,
        updatedDate: new Date().toLocaleDateString("pt-BR"),
        baseUrl: process.env.API_URL,
      };

      this.handleUpdatedSendEmail(
        paramsEmail,
        "customerSubscriptionUpdated",
        contextParams
      );

      return userPlan;
    } catch (error) {
      console.error(
        "Erro ao processar atualização de assinatura:",
        error.message
      );
      throw error;
    }
  }

  // END EVENTOS HOOKS

  handleCreatedSendEmail(paramsEmail, template, context) {
    sendEmail(paramsEmail, template, context)
      .then((response) => {
        console.log("Email enviado com sucesso:", response);
      })
      .catch((error) => {
        console.error("Erro ao enviar email:", error);
      });
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

  handleUpdatedSendEmail(paramsEmail, template, context) {
    sendEmail(paramsEmail, template, context)
      .then((response) => {
        console.log("Email enviado com sucesso:", response);
      })
      .catch((error) => {
        console.error("Erro ao enviar email:", error);
      });
  }

  // END EVENTOS EMAILS HOOKS
};
