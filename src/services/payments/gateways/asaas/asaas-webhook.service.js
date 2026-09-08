/**
 * Webhook do Asaas.
 *
 * Regra de ouro: responder 200 sempre que o evento foi *recebido e entendido*,
 * mesmo quando não há nada a fazer. Devolver erro faz o Asaas reentregar em
 * loop. Só token inválido e falha real de banco saem com status de erro.
 *
 * @see docs/contextos/plans.md
 */

const {
  User,
  Plans,
  UserPlans,
  AsaasSubscription,
  AsaasWebhookEvent,
} = require('../../../../models');
const {
  PLAN_NOTICE_KINDS,
  sendPlanNotice,
} = require('../../../plans/plan-notifications');
const { ok, badRequest, serverError } = require('../../../../utils/httpResponse');
const {
  ASAAS_SUBSCRIPTION_STATUS,
  resolvePlanStatusForEventAsaas,
  parseExternalReferenceAsaas,
} = require('./asaas-rules');
const { verifyWebhookAsaas } = require('./asaas-webhook-verify');

/** Eventos que encerram a recorrência no Asaas. */
const ASAAS_TERMINAL_EVENTS = new Set([
  'SUBSCRIPTION_DELETED',
  'SUBSCRIPTION_INACTIVATED',
]);

/** Status que representam pagamento entrando — é onde a troca de plano vale. */
const ENTITLING_PLAN_STATUSES = new Set(['active']);

/** O payload muda de forma conforme o evento (cobrança ou assinatura). */
function extractEventSubjectAsaas(asaasEvent) {
  const payment = asaasEvent.payment || null;
  const subscription = asaasEvent.subscription || null;
  const subject = payment || subscription || {};

  return {
    payment,
    subscription,
    asaasPaymentId: payment ? payment.id || null : null,
    asaasSubscriptionId:
      (payment && payment.subscription) ||
      (subscription && subscription.id) ||
      null,
    externalReference: subject.externalReference || null,
    nextDueDate: subject.nextDueDate || subject.dueDate || null,
    invoiceUrl: subject.invoiceUrl || null,
  };
}

class AsaasWebhookService {
  /** POST /asaas/webhook — sem autenticação de usuário, só token do Asaas. */
  async handleWebhook(req, res) {
    const verification = verifyWebhookAsaas(req);
    if (!verification.ok) {
      if (verification.status === 500) {
        return serverError(res, verification.message);
      }
      return badRequest(res, verification.message);
    }

    const asaasEvent = verification.event;
    const asaasEventName = String(asaasEvent.event).trim().toUpperCase();
    const subject = extractEventSubjectAsaas(asaasEvent);

    // Sem `id` não dá para deduplicar; usa uma chave derivada estável.
    const asaasEventId = String(
      asaasEvent.id ||
        `${asaasEventName}:${subject.asaasPaymentId || subject.asaasSubscriptionId || 'unknown'}`
    );

    try {
      const [eventRow, created] = await AsaasWebhookEvent.findOrCreate({
        where: { asaas_event_id: asaasEventId },
        defaults: {
          asaas_event_id: asaasEventId,
          asaas_event_name: asaasEventName,
          asaas_payment_id: subject.asaasPaymentId,
          asaas_subscription_id: subject.asaasSubscriptionId,
        },
      });

      if (!created && eventRow.asaas_processed_at) {
        // Reentrega: já processamos. Confirma para o Asaas parar de tentar.
        return ok(res, {
          message: 'Evento já processado',
          meta: { duplicated: true },
        });
      }

      const result = await this.applyEvent(asaasEventName, subject);

      await eventRow.update({ asaas_processed_at: new Date() });

      return ok(res, { message: 'Evento processado', meta: result });
    } catch (error) {
      // Erro real: devolve 500 para o Asaas reentregar mais tarde.
      console.error('Erro ao processar webhook Asaas:', error);
      return serverError(res, 'Erro ao processar evento');
    }
  }

  /**
   * Traduz o evento em mudança de estado local.
   * @returns {Promise<{ applied: boolean, reason?: string, status?: string }>}
   */
  async applyEvent(asaasEventName, subject) {
    const nextStatus = resolvePlanStatusForEventAsaas(asaasEventName);
    if (!nextStatus) {
      // Ex.: PAYMENT_CREATED — informativo, não muda direito de acesso.
      return { applied: false, reason: 'evento sem efeito no acesso' };
    }

    const subscriptionRow = await this.findSubscriptionRow(subject);
    const reference = parseExternalReferenceAsaas(subject.externalReference);
    const userId = reference.userId || (subscriptionRow && subscriptionRow.user_id) || null;

    if (!userId) {
      // Não achamos o dono: registra e segue, sem travar a fila do Asaas.
      return { applied: false, reason: 'assinatura não encontrada' };
    }

    const userPlan = await UserPlans.findOne({ where: { user_id: userId } });
    if (!userPlan) {
      return { applied: false, reason: 'plano do usuário não encontrado' };
    }

    const planUpdate = { status: nextStatus, provider: 'asaas' };

    // Troca de plano só vale quando o pagamento entra: até aqui o assinante
    // continuou no plano antigo, que era o que ele tinha pago.
    const paidPlanId =
      reference.planId || (subscriptionRow && subscriptionRow.plan_id) || null;
    if (
      ENTITLING_PLAN_STATUSES.has(nextStatus) &&
      paidPlanId &&
      Number(userPlan.plan_id) !== Number(paidPlanId)
    ) {
      planUpdate.plan_id = paidPlanId;
      planUpdate.plan_canceled = false;
    }

    await userPlan.update(planUpdate);

    if (nextStatus === 'past_due') {
      await this.notifyPastDue(userId, userPlan.plan_id, subject.invoiceUrl);
    }

    if (subscriptionRow) {
      const subscriptionUpdate = {};
      if (subject.nextDueDate) {
        subscriptionUpdate.asaas_next_due_date = subject.nextDueDate;
      }
      if (ASAAS_TERMINAL_EVENTS.has(asaasEventName)) {
        subscriptionUpdate.asaas_status = ASAAS_SUBSCRIPTION_STATUS.INACTIVE;
      }
      if (Object.keys(subscriptionUpdate).length) {
        await subscriptionRow.update(subscriptionUpdate);
      }
    }

    return { applied: true, status: nextStatus, userId };
  }

  /**
   * Avisa o assinante que a cobrança venceu.
   *
   * O Asaas manda o aviso de cobrança dele, mas não fala de acesso — quem
   * explica a tolerância e o risco de suspensão é este e-mail. Falha aqui não
   * pode virar 500: o Asaas reentregaria o evento e o status já foi aplicado.
   */
  async notifyPastDue(userId, planId, invoiceUrl) {
    try {
      const [user, plan] = await Promise.all([
        User.findByPk(userId, { attributes: ['id', 'name', 'email'] }),
        planId
          ? Plans.findByPk(planId, { attributes: ['display_name', 'plan_name'] })
          : null,
      ]);

      // `await` dentro do try de propósito: sem ele a promise rejeitada
      // escaparia do catch e o evento voltaria 500 para o Asaas reentregar.
      return await sendPlanNotice({
        kind: PLAN_NOTICE_KINDS.PAST_DUE,
        user,
        planName: plan && (plan.display_name || plan.plan_name),
        invoiceUrl,
      });
    } catch (error) {
      console.error('Erro ao avisar cobrança vencida:', error && error.message);
      return { sent: false, reason: 'falha ao montar aviso' };
    }
  }

  async findSubscriptionRow(subject) {
    if (!subject.asaasSubscriptionId) return null;
    return AsaasSubscription.findOne({
      where: { asaas_subscription_id: subject.asaasSubscriptionId },
    });
  }
}

module.exports = new AsaasWebhookService();
module.exports.extractEventSubjectAsaas = extractEventSubjectAsaas;
module.exports.ASAAS_TERMINAL_EVENTS = ASAAS_TERMINAL_EVENTS;
module.exports.ENTITLING_PLAN_STATUSES = ENTITLING_PLAN_STATUSES;
