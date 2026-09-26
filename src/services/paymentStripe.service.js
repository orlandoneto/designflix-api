const stripe = require("../config/stripe");
const { sendEmail } = require("../utils/emailService");
const { UserPlans, Plans, User } = require("../models");
const { PLAN_NAMES } = require("../utils/constants/constants");

module.exports = class {
  async createSubscription(req, res) {
    try {
      const { userId, priceId, email, paymentMethodId } = req.body;
      const customer = await stripe.customers.create({
        email,
        payment_method: paymentMethodId,
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
        metadata: {
          site: "flixdesign",
          userId: userId.toString(),
        },
      });

      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id,
      });

      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ plan: priceId }],
        expand: ["latest_invoice.payment_intent"],
        metadata: {
          site: "flixdesign",
          userId: userId.toString(),
        },
      });

      const plan = await Plans.findOne({
        where: { stripe_price_id: priceId },
      });

      if (!plan) {
        return res.status(404).send("Plano não encontrado");
      }

      await UserPlans.create({
        user_id: userId,
        plan_id: plan.id,
        stripe_customer_id: customer.id,
        stripe_subscription_id: subscription.id,
      });

      res.status(200).json(subscription);
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: error.message,
      });
    }
  }

  async updateSubscription(req, res) {
    try {
      const { customerId, priceId, userId } = req.body;

      // Validação básica
      if (!customerId || !priceId || !userId) {
        return res.status(400).json({
          message: "Campos obrigatórios ausentes.",
        });
      }

      // Verificar plano atual do usuário no banco
      const userPlan = await UserPlans.findOne({ where: { user_id: userId } });
      if (!userPlan) {
        return res.status(404).json({
          message: "Plano do usuário não encontrado.",
        });
      }

      // Verificar se já existe upgrade agendado
      if (userPlan.scheduled_plan_id) {
        return res.status(400).json({
          message: "Já existe um upgrade agendado para este usuário.",
        });
      }

      // 1. Buscar assinaturas ativas no Stripe
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
      });

      if (subscriptions.data.length === 0) {
        return res.status(404).json({
          message: "Assinatura ativa não encontrada.",
        });
      }

      if (subscriptions.data.length > 1) {
        return res.status(400).json({
          message: "Mais de uma assinatura ativa detectada para este cliente.",
        });
      }

      const currentSubscription = subscriptions.data[0];

      // 2. Verificar se já está no mesmo plano
      const currentPriceId = currentSubscription.items.data[0].price.id;
      if (currentPriceId === priceId) {
        return res.status(400).json({
          message: "O usuário já está neste plano.",
        });
      }

      // 3. Buscar novo plano no banco
      const newPlan = await Plans.findOne({
        where: { stripe_price_id: priceId },
      });

      if (!newPlan) {
        return res.status(404).json({
          message: "Novo plano não encontrado.",
        });
      }

      // 4. Calcular dias restantes
      const currentPeriodEnd = new Date(
        currentSubscription.current_period_end * 1000
      );
      const daysRemaining = Math.floor(
        (currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      // 5. Atualizar o banco de dados
      await UserPlans.update(
        {
          subscription_days_left: daysRemaining,
          scheduled_plan_id: newPlan.id,
          scheduled_plan_start_at: currentPeriodEnd,
          stripe_subscription_id: currentSubscription.id,
        },
        {
          where: { user_id: userId },
        }
      );

      // 6. Atualizar a assinatura no Stripe
      const updatedSubscription = await stripe.subscriptions.update(
        currentSubscription.id,
        {
          items: [
            {
              id: currentSubscription.items.data[0].id,
              price: priceId,
            },
          ],
          proration_behavior: "none",
          billing_cycle_anchor: "unchanged",
        }
      );

      // 7. Log para auditoria
      console.log(
        `[UPGRADE] Usuário ${userId} agendou troca para plano ${newPlan.name
        } (ID: ${newPlan.id}) para ${currentPeriodEnd.toISOString()}`
      );

      return res.status(200).json({
        success: true,
        message: `Upgrade agendado com sucesso. O novo plano começará em ${daysRemaining} dias.`,
        current_plan_end_date: currentPeriodEnd,
        new_plan: newPlan.name,
        next_payment_date: currentPeriodEnd,
        next_payment_amount: newPlan.price,
        updatedSubscription,
      });
    } catch (error) {
      console.error("Erro no upgrade:", error);
      return res.status(500).json({
        message: "Erro ao processar upgrade",
        error: error.message,
      });
    }
  }

  async refundSubscriptionWithin7Days(req, res) {
    const { customerId } = req.params;

    try {
      // Buscar a assinatura ativa do cliente
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Nenhuma assinatura ativa encontrada para este cliente.",
        });
      }

      // Buscar os pagamentos associados à assinatura
      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit: 1,
      });

      if (invoices.data.length === 0 || !invoices.data[0].charge) {
        return res.status(404).json({
          success: false,
          message: "Nenhum pagamento encontrado para reembolso.",
        });
      }

      const chargeId = invoices.data[0].charge;
      const charge = await stripe.charges.retrieve(chargeId, {
        expand: ['customer']
      });

      // Verificar se o pagamento foi feito há menos de 7 dias
      const paymentTime = charge.created;
      const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;

      if (paymentTime < sevenDaysAgo) {
        return res.status(400).json({
          success: false,
          message: "O período de reembolso de 7 dias já expirou.",
        });
      }

      // Cancelar a assinatura no Stripe
      const subscription = subscriptions.data[0];
      await stripe.subscriptions.cancel(subscription.id, {
        prorate: false,
        invoice_now: false
      });
      console.log(`[CANCELAMENTO] Assinatura ${subscription.id} cancelada imediatamente para cliente ${customerId}`);

      // Buscar informações do plano no banco de dados
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
            attributes: ["name", "email"],
          }
        ]
      });

      // Criar o reembolso
      const refund = await stripe.refunds.create({
        charge: chargeId,
        metadata: {
          site: "flixdesign",
          userId: userPlan.user.id.toString(),
        },
      });

      await UserPlans.destroy({
        where: { stripe_customer_id: customerId }
      });

      console.log(`[REEMBOLSO] Plano removido para cliente ${customerId}`);

      // Preparar e enviar email de reembolso
      if (userPlan?.user?.email) {
        const emailUser = userPlan.user.email;
        const userName = userPlan.user.name || charge.customer.name || "Cliente";
        const planName = userPlan.plans?.plan_name || "Plano";

        const paramsEmail = {
          email: emailUser,
          name: userName,
          title: "Reembolso de plano",
          description: "Reembolso processado com sucesso",
        };

        const contextParams = {
          name: userName,
          planName: PLAN_NAMES?.[planName] || planName,
          amount: (charge.amount / 100).toFixed(2),
          refundDate: new Date().toLocaleDateString("pt-BR"),
          baseUrl: process.env.API_URL,
        };

        // Enviar email usando o template chargeRefund
        this.handleRefudedOrCanceledSendEmail(
          paramsEmail,
          "chargeRefund",
          contextParams
        );

        // Log para auditoria
        console.log(`[REEMBOLSO MANUAL] Reembolso processado para cliente ${userName} (ID: ${customerId}). Valor: R$ ${(charge.amount / 100).toFixed(2)}`);
      }

      return res.status(200).json({
        success: true,
        message: "Reembolso realizado com sucesso e plano marcado como cancelado.",
        refund,
      });
    } catch (error) {
      console.error("Erro ao processar o reembolso:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao processar o reembolso.",
        error: error.message,
      });
    }
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
      const plans = await Plans.findAll();
      if (!plans) {
        return res.status(404).send("Planos não encontrado");
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
            // `price_cents` e `tier` são o que deixa o front saber se o plano é
            // pago sem olhar coluna de gateway (legado da Stripe/Mercado Pago).
            attributes: [
              "id",
              "plan_name",
              "display_name",
              "tier",
              "price_cents",
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
      // Sem responder aqui a requisição ficava pendurada (504 no Nginx) e virava unhandledRejection.
      return res.status(500).json({ message: "Erro ao buscar planos do usuário" });
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
          "Bem-vindo à ON Graph!"
        );
        break;

      case "customer.subscription.updated": // Evento de atualização de assinaturas
        await this.handleSubscriptionUpdated(eventData);
        break;

      case "customer.subscription.deleted": // Evento de cancelamento de assinaturas
        await this.handleSubscriptionDeleted(
          eventData,
          "customerSubscriptionDeleted",
          "Cancelamento de plano"
        );
        break;

      case "charge.refunded": // Evento de reembolso de assinatura após 7 dias
        await this.handleChangeRefund(
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
          `Dados incompletos no plano ou usuário. Usuário: ${userName}`);
        return null;
      }

      const paramsEmail = {
        email: emailUser,
        name: userName,
        title: emailTitle,
        description: `Obrigado por se tornar um assinante da ON Graph!`,
      };

      const contextParams = {
        name: userName,
        planName: PLAN_NAMES?.[planName] || planName,
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

      // Verifica se é um cancelamento
      if (data.cancel_at_period_end) {
        const cancelDate = new Date(data.cancel_at * 1000).toLocaleDateString("pt-BR");
        const periodEndDate = new Date(data.current_period_end * 1000).toLocaleDateString("pt-BR");

        statusPlan = "Cancelamento solicitado";
        additionalDetails = `Cancelamento em: ${cancelDate}, Acesso até: ${periodEndDate}`;
        console.log(`🔵 Plano pago cancelado. Acesso até: ${periodEndDate}`);

        // Update user plan status in database
        const endDate = new Date(data.current_period_end * 1000);
        const now = new Date();
        const daysLeft = Math.floor((endDate - now) / (1000 * 60 * 60 * 24));

        await UserPlans.update(
          {
            subscription_days_left: daysLeft,
            plan_finish_at: data.current_period_end * 1000,
            plan_canceled: 1,
          },
          {
            where: { stripe_customer_id: customerId }
          }
        );

      } else if (!data.cancel_at_period_end && !data.cancellation_details?.reason) {
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
        planName: PLAN_NAMES?.[planName] || planName,
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

  async handleSubscriptionDeleted(
    data,
    emailTemplate,
    emailTitle
  ) {
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

      // Verifica se o plano está expirado
      const now = new Date();
      const isExpired =
        userPlan.subscription_days_left <= 0 ||
        (userPlan.plan_finish_at && new Date(userPlan.plan_finish_at) <= now);

      // Se era um plano pago que terminou e está expirado
      if (data.status === 'canceled' && isExpired) {
        console.log('🔴 Plano pago expirado. Removendo acesso.');

        // Remove o plano do usuário no banco de dados
        await userPlan.destroy();

        // Log para auditoria
        console.log(`[CANCELAMENTO] Plano removido para usuário ${userName} (ID: ${userPlan.user_id}) - Motivo: Plano expirado`);
      } else if (data.status === 'canceled') {
        // Se o plano foi cancelado mas ainda não expirou, apenas marca como cancelado
        console.log('🟡 Plano cancelado mas ainda não expirado. Mantendo acesso até o vencimento.');
        await userPlan.update({ plan_canceled: true });
        console.log(`[CANCELAMENTO] Plano marcado como cancelado para usuário ${userName} (ID: ${userPlan.user_id}) - Aguardando expiração`);
      }

      const paramsEmail = {
        email: emailUser,
        name: userName,
        title: emailTitle,
        description: emailTitle,
      };

      const contextParams = {
        name: userName,
        planName: PLAN_NAMES?.[planName] || planName,
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

  async handleChangeRefund(data, emailTemplate, emailTitle) {
    try {
      // Validação específica para eventos de reembolso do Stripe
      if (!data?.id || !data?.object || data.object !== 'charge' || !data?.refunded) {
        throw new Error("Evento de reembolso inválido ou incompleto.");
      }

      // Busca a cobrança original apenas com customer
      const charge = await stripe.charges.retrieve(data.id, {
        expand: ['customer']
      });

      if (!charge?.customer?.id) {
        throw new Error("Não foi possível identificar o cliente do reembolso.");
      }

      const customerId = charge.customer.id;
      const customer = charge.customer;
      const emailUser = customer.email;
      const userName = customer.name || "Cliente";

      if (!emailUser) {
        throw new Error("Não foi possível obter o e-mail do cliente.");
      }

      // Busca informações do plano no banco de dados
      const userPlan = await UserPlans.findOne({
        where: { stripe_customer_id: customerId },
        include: [
          {
            model: Plans,
            as: "plans",
            attributes: ["plan_name"],
          }
        ]
      });

      let planName = "Plano";
      if (userPlan?.plans?.plan_name) {
        planName = userPlan.plans.plan_name;
      }

      // Log para auditoria
      console.log(`[REEMBOLSO STRIPE] Reembolso processado para cliente ${userName} (ID: ${customerId}). Valor: R$ ${(data.amount / 100).toFixed(2)}`);

      const paramsEmail = {
        email: emailUser,
        name: userName,
        title: emailTitle,
        description: "Reembolso processado com sucesso",
      };

      const contextParams = {
        name: userName,
        planName: PLAN_NAMES?.[planName] || planName,
        amount: (data.amount / 100).toFixed(2),
        refundDate: new Date().toLocaleDateString("pt-BR"),
        baseUrl: process.env.API_URL,
      };

      this.handleRefudedOrCanceledSendEmail(
        paramsEmail,
        emailTemplate,
        contextParams
      );

      return {
        customer_id: customerId,
        email: emailUser,
        name: userName,
        plan_name: planName,
        amount: data.amount
      };
    } catch (error) {
      console.error(
        "Erro ao processar reembolso do Stripe:",
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

