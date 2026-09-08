/**
 * Ciclo de vida da assinatura no Asaas.
 *
 * O usuário vem sempre do JWT (`req.params.userId`), nunca do corpo — senão
 * qualquer um assina em nome de outro.
 *
 * @see docs/contextos/plans.md
 */

const {
  User,
  UserAddress,
  Plans,
  UserPlans,
  AsaasSubscription,
} = require('../../../../models');
const {
  ok,
  badRequest,
  notFound,
  serverError,
} = require('../../../../utils/httpResponse');
const { PLAN_STATUS } = require('../../../download/daily-download-limit');
const {
  ASAAS_SUBSCRIPTION_STATUS,
  buildCustomerPayloadAsaas,
  buildSubscriptionPayloadAsaas,
  buildTokenizePayloadAsaas,
  resolveBillingTypeAsaas,
  sanitizeCpfCnpjAsaas,
  valueToCentsAsaas,
} = require('./asaas-rules');
const { validatePlanChange } = require('../../../plans/plans-rules');
const {
  PLAN_NOTICE_KINDS,
  sendPlanNotice,
} = require('../../../plans/plan-notifications');
const {
  findCustomerByCpfCnpjAsaas,
  createCustomerAsaas,
  createSubscriptionAsaas,
  cancelSubscriptionAsaas,
  listSubscriptionPaymentsAsaas,
  tokenizeCreditCardAsaas,
} = require('./asaas-api');
const { AsaasError } = require('./asaas-client');

/** Status locais que ainda representam assinatura viva no Asaas. */
const LIVE_PLAN_STATUSES = [
  PLAN_STATUS.PENDING,
  PLAN_STATUS.ACTIVE,
  PLAN_STATUS.PAST_DUE,
];

function resolveRemoteIp(req) {
  const forwarded = String(
    (req.headers && req.headers['x-forwarded-for']) || ''
  ).split(',')[0];
  return forwarded.trim() || req.ip || null;
}

function mapSubscriptionResponse(asaasSubscriptionRow, plan) {
  return {
    id: asaasSubscriptionRow.id,
    planId: asaasSubscriptionRow.plan_id,
    planName: plan ? plan.display_name || plan.plan_name : null,
    asaasSubscriptionId: asaasSubscriptionRow.asaas_subscription_id,
    billingType: asaasSubscriptionRow.asaas_billing_type,
    cycle: asaasSubscriptionRow.asaas_cycle,
    status: asaasSubscriptionRow.asaas_status,
    valueCents: asaasSubscriptionRow.asaas_value_cents,
    nextDueDate: asaasSubscriptionRow.asaas_next_due_date,
  };
}

class AsaasSubscriptionService {
  /**
   * POST /asaas/subscriptions
   * body: { planId, billingType, creditCardToken? }
   */
  async createSubscription(req, res) {
    const userId = Number(req.params.userId);

    try {
      const planId = Number(req.body && req.body.planId);
      if (!Number.isInteger(planId) || planId < 1) {
        return badRequest(res, 'Plano inválido');
      }

      const plan = await Plans.findByPk(planId);
      if (!plan) {
        return notFound(res, 'Plano não encontrado');
      }
      if (!plan.active) {
        return badRequest(res, 'Plano indisponível');
      }
      if (plan.gateway !== 'asaas') {
        return badRequest(res, 'Plano não é cobrado pelo Asaas');
      }

      const existing = await AsaasSubscription.findOne({
        where: {
          user_id: userId,
          asaas_status: ASAAS_SUBSCRIPTION_STATUS.ACTIVE,
        },
      });
      if (existing) {
        return badRequest(
          res,
          'Você já tem uma assinatura ativa. Cancele antes de assinar outro plano.'
        );
      }

      const identity = await this.resolveBillingIdentity(userId, req.body);
      if (!identity.ok) {
        if (identity.status === 404) return notFound(res, identity.message);
        return badRequest(res, identity.message);
      }

      const asaasCustomer = await this.ensureCustomerAsaas(identity);

      const subscriptionPayload = buildSubscriptionPayloadAsaas({
        asaasCustomerId: asaasCustomer && asaasCustomer.id,
        plan,
        userId,
        billingType: req.body && req.body.billingType,
        nextDueDate: new Date(),
        creditCardToken: req.body && req.body.creditCardToken,
        remoteIp: resolveRemoteIp(req),
      });
      if (!subscriptionPayload.ok) {
        return badRequest(res, subscriptionPayload.message);
      }

      const asaasSubscription = await createSubscriptionAsaas(
        subscriptionPayload.payload
      );

      const created = await AsaasSubscription.create({
        user_id: userId,
        plan_id: plan.id,
        asaas_customer_id: asaasCustomer.id,
        asaas_subscription_id: asaasSubscription.id,
        asaas_billing_type:
          resolveBillingTypeAsaas(asaasSubscription.billingType) ||
          subscriptionPayload.payload.billingType,
        asaas_cycle: asaasSubscription.cycle || subscriptionPayload.payload.cycle,
        asaas_status:
          asaasSubscription.status || ASAAS_SUBSCRIPTION_STATUS.ACTIVE,
        asaas_value_cents: valueToCentsAsaas(
          asaasSubscription.value != null
            ? asaasSubscription.value
            : subscriptionPayload.payload.value
        ),
        asaas_next_due_date:
          asaasSubscription.nextDueDate ||
          subscriptionPayload.payload.nextDueDate,
      });

      // Assinatura criada não é pagamento confirmado — quem ativa é o webhook.
      await this.upsertUserPlan(userId, plan.id, PLAN_STATUS.PENDING);

      return ok(res, {
        message: 'Assinatura criada. Aguardando confirmação do pagamento.',
        data: mapSubscriptionResponse(created, plan),
        meta: { invoiceUrl: asaasSubscription.invoiceUrl || null },
      });
    } catch (error) {
      if (error instanceof AsaasError) {
        console.error('Erro do Asaas ao criar assinatura:', error.message);
        return badRequest(res, error.message);
      }
      console.error('Erro ao criar assinatura Asaas:', error);
      return serverError(res, 'Erro ao criar assinatura');
    }
  }

  /**
   * PUT /asaas/subscriptions/me/plan
   * body: { planId, billingType?, creditCardToken? }
   *
   * Troca de plano sem pró-rata: a recorrência atual é encerrada e a do plano
   * novo é criada na hora, mas o direito de acesso **não** muda aqui. Quem move
   * `user_plans.plan_id` é o webhook, quando o primeiro pagamento do plano novo
   * é confirmado — senão quem clica em trocar perderia na hora o plano que já
   * pagou, e ficaria sem nada se o Pix nunca fosse pago.
   */
  async changePlan(req, res) {
    const userId = Number(req.params.userId);

    try {
      const targetPlanId = Number(req.body && req.body.planId);
      if (!Number.isInteger(targetPlanId) || targetPlanId < 1) {
        return badRequest(res, 'Plano inválido');
      }

      const current = await AsaasSubscription.findOne({
        where: {
          user_id: userId,
          asaas_status: ASAAS_SUBSCRIPTION_STATUS.ACTIVE,
        },
        order: [['id', 'DESC']],
        include: [{ model: Plans, as: 'plan' }],
      });
      if (!current) {
        return badRequest(
          res,
          'Você não tem assinatura ativa para trocar. Assine um plano.'
        );
      }

      const targetPlan = await Plans.findByPk(targetPlanId);
      if (!targetPlan) {
        return notFound(res, 'Plano não encontrado');
      }

      const change = validatePlanChange({
        currentPlan: current.plan,
        targetPlan,
      });
      if (!change.ok) {
        return badRequest(res, change.message);
      }

      const identity = await this.resolveBillingIdentity(userId, req.body);
      if (!identity.ok) {
        if (identity.status === 404) return notFound(res, identity.message);
        return badRequest(res, identity.message);
      }

      const asaasCustomer = await this.ensureCustomerAsaas(identity);

      // Sem `billingType` no corpo, repete o meio de pagamento atual: quem
      // troca de plano raramente quer trocar de forma de pagamento também.
      const billingType =
        resolveBillingTypeAsaas(req.body && req.body.billingType) ||
        current.asaas_billing_type;

      const subscriptionPayload = buildSubscriptionPayloadAsaas({
        asaasCustomerId: asaasCustomer && asaasCustomer.id,
        plan: targetPlan,
        userId,
        billingType,
        nextDueDate: new Date(),
        creditCardToken: req.body && req.body.creditCardToken,
        remoteIp: resolveRemoteIp(req),
      });
      if (!subscriptionPayload.ok) {
        return badRequest(res, subscriptionPayload.message);
      }

      // Cancelar antes de criar evita cobrança dupla — o risco inverso (ficar
      // sem recorrência) é tratado no catch abaixo.
      await cancelSubscriptionAsaas(current.asaas_subscription_id);
      await current.update({
        asaas_status: ASAAS_SUBSCRIPTION_STATUS.INACTIVE,
      });

      let asaasSubscription;
      try {
        asaasSubscription = await createSubscriptionAsaas(
          subscriptionPayload.payload
        );
      } catch (error) {
        // A antiga já foi cancelada: encerra o acesso no fim do período pago em
        // vez de deixar plano ativo que ninguém mais cobra.
        await this.markPlanCanceled(userId, current.asaas_next_due_date);
        throw error;
      }

      const created = await AsaasSubscription.create({
        user_id: userId,
        plan_id: targetPlan.id,
        asaas_customer_id: asaasCustomer.id,
        asaas_subscription_id: asaasSubscription.id,
        asaas_billing_type:
          resolveBillingTypeAsaas(asaasSubscription.billingType) ||
          subscriptionPayload.payload.billingType,
        asaas_cycle:
          asaasSubscription.cycle || subscriptionPayload.payload.cycle,
        asaas_status:
          asaasSubscription.status || ASAAS_SUBSCRIPTION_STATUS.ACTIVE,
        asaas_value_cents: valueToCentsAsaas(
          asaasSubscription.value != null
            ? asaasSubscription.value
            : subscriptionPayload.payload.value
        ),
        asaas_next_due_date:
          asaasSubscription.nextDueDate ||
          subscriptionPayload.payload.nextDueDate,
      });

      return ok(res, {
        message:
          'Troca de plano iniciada. O plano novo passa a valer quando o pagamento for confirmado.',
        data: mapSubscriptionResponse(created, targetPlan),
        meta: {
          invoiceUrl: asaasSubscription.invoiceUrl || null,
          planChange: {
            kind: change.kind,
            fromPlanId: current.plan_id,
            toPlanId: targetPlan.id,
            effective: 'on_payment',
          },
        },
      });
    } catch (error) {
      if (error instanceof AsaasError) {
        console.error('Erro do Asaas ao trocar de plano:', error.message);
        return badRequest(res, error.message);
      }
      console.error('Erro ao trocar de plano Asaas:', error);
      return serverError(res, 'Erro ao trocar de plano');
    }
  }

  /** GET /asaas/subscriptions/me */
  async getMySubscription(req, res) {
    const userId = Number(req.params.userId);

    try {
      const subscription = await AsaasSubscription.findOne({
        where: { user_id: userId },
        order: [['id', 'DESC']],
        include: [{ model: Plans, as: 'plan' }],
      });
      if (!subscription) {
        return notFound(res, 'Nenhuma assinatura encontrada');
      }

      return ok(res, {
        message: 'Assinatura encontrada',
        data: mapSubscriptionResponse(subscription, subscription.plan),
      });
    } catch (error) {
      console.error('Erro ao buscar assinatura Asaas:', error);
      return serverError(res, 'Erro ao buscar assinatura');
    }
  }

  /**
   * GET /asaas/subscriptions/me/payments
   * Substitui o histórico de faturas que a Stripe entregava pronto no portal.
   */
  async listMyPayments(req, res) {
    const userId = Number(req.params.userId);

    try {
      const subscription = await AsaasSubscription.findOne({
        where: { user_id: userId },
        order: [['id', 'DESC']],
      });
      if (!subscription) {
        return notFound(res, 'Nenhuma assinatura encontrada');
      }

      const asaasPayments = await listSubscriptionPaymentsAsaas(
        subscription.asaas_subscription_id
      );

      const data = ((asaasPayments && asaasPayments.data) || []).map(
        (payment) => ({
          id: payment.id,
          status: payment.status,
          billingType: payment.billingType,
          valueCents: valueToCentsAsaas(payment.value),
          dueDate: payment.dueDate,
          paymentDate: payment.paymentDate || null,
          invoiceUrl: payment.invoiceUrl || null,
          bankSlipUrl: payment.bankSlipUrl || null,
        })
      );

      return ok(res, { message: 'Cobranças da assinatura', data });
    } catch (error) {
      if (error instanceof AsaasError) {
        console.error('Erro do Asaas ao listar cobranças:', error.message);
        return badRequest(res, error.message);
      }
      console.error('Erro ao listar cobranças Asaas:', error);
      return serverError(res, 'Erro ao listar cobranças');
    }
  }

  /**
   * DELETE /asaas/subscriptions/me
   *
   * Cancela a recorrência no Asaas mas **mantém o acesso** até o fim do período
   * já pago. Quem expira é o job de suspensão.
   */
  async cancelSubscription(req, res) {
    const userId = Number(req.params.userId);

    try {
      const subscription = await AsaasSubscription.findOne({
        where: { user_id: userId },
        order: [['id', 'DESC']],
      });
      if (!subscription) {
        return notFound(res, 'Nenhuma assinatura encontrada');
      }
      if (subscription.asaas_status === ASAAS_SUBSCRIPTION_STATUS.INACTIVE) {
        return badRequest(res, 'Assinatura já está cancelada');
      }

      await cancelSubscriptionAsaas(subscription.asaas_subscription_id);
      await subscription.update({
        asaas_status: ASAAS_SUBSCRIPTION_STATUS.INACTIVE,
      });

      const userPlan = await UserPlans.findOne({ where: { user_id: userId } });
      if (userPlan) {
        await userPlan.update({
          plan_canceled: true,
          plan_finish_at: subscription.asaas_next_due_date || null,
        });
      }

      await this.notifyCanceled(userId, subscription);

      return ok(res, {
        message:
          'Assinatura cancelada. O acesso continua até o fim do período já pago.',
        meta: { accessUntil: subscription.asaas_next_due_date || null },
      });
    } catch (error) {
      if (error instanceof AsaasError) {
        console.error('Erro do Asaas ao cancelar assinatura:', error.message);
        return badRequest(res, error.message);
      }
      console.error('Erro ao cancelar assinatura Asaas:', error);
      return serverError(res, 'Erro ao cancelar assinatura');
    }
  }

  /**
   * POST /asaas/credit-card/token
   *
   * A chave de API não pode ir para o browser, então o número do cartão passa
   * por aqui. Em troca: nada de PAN em log (nem em erro), whitelist de campos
   * no builder, e só o token devolvido é guardado.
   */
  async tokenizeCreditCard(req, res) {
    const userId = Number(req.params.userId);

    try {
      const identity = await this.resolveBillingIdentity(userId, req.body);
      if (!identity.ok) {
        if (identity.status === 404) return notFound(res, identity.message);
        return badRequest(res, identity.message);
      }

      const asaasCustomer = await this.ensureCustomerAsaas(identity);

      const tokenizePayload = buildTokenizePayloadAsaas({
        asaasCustomerId: asaasCustomer && asaasCustomer.id,
        holderName: req.body && req.body.holderName,
        number: req.body && req.body.number,
        expiryMonth: req.body && req.body.expiryMonth,
        expiryYear: req.body && req.body.expiryYear,
        ccv: req.body && req.body.ccv,
        holder: {
          name: identity.user.name,
          email: identity.user.email,
          cpfCnpj: identity.cpfCnpj,
          phone: identity.phone,
          postalCode: identity.postalCode,
          addressNumber: identity.addressNumber,
        },
        remoteIp: resolveRemoteIp(req),
      });
      if (!tokenizePayload.ok) {
        return badRequest(res, tokenizePayload.message);
      }

      const asaasToken = await tokenizeCreditCardAsaas(tokenizePayload.payload);

      return ok(res, {
        message: 'Cartão tokenizado',
        data: {
          creditCardToken: asaasToken.creditCardToken,
          creditCardNumber: asaasToken.creditCardNumber || null,
          creditCardBrand: asaasToken.creditCardBrand || null,
        },
      });
    } catch (error) {
      if (error instanceof AsaasError) {
        // `AsaasError.message` vem da resposta do Asaas, nunca do nosso payload.
        console.error('Erro do Asaas ao tokenizar cartão:', error.message);
        return badRequest(res, error.message);
      }
      // Sem `error` inteiro no log: o stack pode carregar o corpo da request.
      console.error('Erro ao tokenizar cartão:', error && error.message);
      return serverError(res, 'Erro ao processar cartão');
    }
  }

  /**
   * Monta os dados de cobrança combinando cadastro e checkout.
   *
   * O CPF do cadastro tem precedência; o do corpo é fallback e fica salvo, para
   * o assinante não redigitar na renovação. CPF salvo mas inválido (lixo do
   * cadastro antigo por admin) é tratado como ausente.
   *
   * @returns {Promise<{ ok: true, user, cpfCnpj, phone, postalCode, addressNumber } | { ok: false, status?: number, message: string }>}
   */
  async resolveBillingIdentity(userId, body = {}) {
    const user = await User.findByPk(userId, {
      attributes: ['id', 'name', 'email', 'cpf', 'phone'],
    });
    if (!user) {
      return { ok: false, status: 404, message: 'Usuário não encontrado' };
    }

    const storedCpf = sanitizeCpfCnpjAsaas(user.cpf);
    const cpfCnpj = storedCpf || sanitizeCpfCnpjAsaas(body.cpf);
    if (!cpfCnpj) {
      return {
        ok: false,
        message: body.cpf
          ? 'CPF inválido'
          : 'Informe o CPF para concluir a assinatura',
      };
    }

    const storedPhone = String(user.phone || '').replace(/\D/g, '');
    const phone = storedPhone || String(body.phone || '').replace(/\D/g, '');

    // CPF repetido entre contas é permitido: bloquear não impede fraude e
    // quebra quem assina numa conta nova por ter perdido o e-mail antigo.
    const profilePatch = {};
    if (!storedCpf) profilePatch.cpf = cpfCnpj;
    if (!storedPhone && phone) profilePatch.phone = phone;
    if (Object.keys(profilePatch).length) {
      await user.update(profilePatch);
    }

    const address = await UserAddress.findOne({
      where: { user_id: userId },
      order: [['isPrincipal', 'DESC']],
    });

    return {
      ok: true,
      user,
      cpfCnpj,
      phone,
      // Endereço salvo vence; o checkout só precisa pedir se não houver.
      postalCode:
        (address && address.postalCode) || (body && body.postalCode) || null,
      addressNumber:
        (address && address.number) || (body && body.addressNumber) || null,
    };
  }

  /** Reaproveita o cliente do Asaas pelo documento em vez de duplicar. */
  async ensureCustomerAsaas(identity) {
    const customerPayload = buildCustomerPayloadAsaas({
      name: identity.user.name,
      email: identity.user.email,
      cpfCnpj: identity.cpfCnpj,
      phone: identity.phone,
      postalCode: identity.postalCode,
    });
    if (!customerPayload.ok) {
      // Chega aqui só com cadastro quebrado (sem nome/e-mail): vira 400 com a
      // mensagem, porque o CPF já foi validado em resolveBillingIdentity.
      throw new AsaasError(customerPayload.message, { status: 400 });
    }

    const found = await findCustomerByCpfCnpjAsaas(customerPayload.payload.cpfCnpj);
    return found || createCustomerAsaas(customerPayload.payload);
  }

  /**
   * Confirma o cancelamento por e-mail, dizendo até quando o acesso vale.
   *
   * A resposta HTTP não pode depender disso: o cancelamento já aconteceu no
   * Asaas, e devolver erro por causa do e-mail faria o usuário tentar de novo.
   */
  async notifyCanceled(userId, subscription) {
    try {
      const [user, plan] = await Promise.all([
        User.findByPk(userId, { attributes: ['id', 'name', 'email'] }),
        subscription.plan_id
          ? Plans.findByPk(subscription.plan_id, {
              attributes: ['display_name', 'plan_name'],
            })
          : null,
      ]);

      // `await` dentro do try de propósito: sem ele a promise rejeitada
      // escaparia do catch e viraria 500 num cancelamento que já deu certo.
      return await sendPlanNotice({
        kind: PLAN_NOTICE_KINDS.CANCELED,
        user,
        planName: plan && (plan.display_name || plan.plan_name),
        accessUntil: subscription.asaas_next_due_date,
      });
    } catch (error) {
      console.error('Erro ao avisar cancelamento:', error && error.message);
      return { sent: false, reason: 'falha ao montar aviso' };
    }
  }

  /** Encerra o acesso no fim do período já pago, sem cortar na hora. */
  async markPlanCanceled(userId, accessUntil) {
    const userPlan = await UserPlans.findOne({ where: { user_id: userId } });
    if (!userPlan) return null;
    return userPlan.update({
      plan_canceled: true,
      plan_finish_at: accessUntil || null,
    });
  }

  /** Cria ou atualiza o direito de acesso, sem duplicar linha. */
  async upsertUserPlan(userId, planId, status) {
    const existing = await UserPlans.findOne({ where: { user_id: userId } });

    if (existing) {
      return existing.update({
        plan_id: planId,
        status,
        provider: 'asaas',
        plan_canceled: false,
      });
    }

    return UserPlans.create({
      user_id: userId,
      plan_id: planId,
      status,
      provider: 'asaas',
    });
  }
}

module.exports = new AsaasSubscriptionService();
module.exports.LIVE_PLAN_STATUSES = LIVE_PLAN_STATUSES;
module.exports.mapSubscriptionResponse = mapSubscriptionResponse;
module.exports.resolveRemoteIp = resolveRemoteIp;
