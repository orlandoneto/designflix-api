/**
 * Tolerância de inadimplência: quem promove `past_due` → `suspended`.
 *
 * Fica fora do módulo Asaas de propósito — a regra é do produto e vale para
 * qualquer gateway. O webhook só marca que venceu; cortar acesso é aqui.
 *
 * @see docs/contextos/plans.md
 */

const { Op } = require('sequelize');
const { UserPlans, User, Plans } = require('../../models');
const { PLAN_STATUS } = require('../download/daily-download-limit');
const { PLAN_NOTICE_KINDS, sendPlanNotice } = require('./plan-notifications');

/** Dias de acesso mantido após a cobrança vencer. */
const DEFAULT_GRACE_PERIOD_DAYS = 5;

function resolveGracePeriodDays() {
  const raw = Number(process.env.PLAN_GRACE_PERIOD_DAYS);
  if (Number.isInteger(raw) && raw >= 0) return raw;
  return DEFAULT_GRACE_PERIOD_DAYS;
}

/**
 * Uma linha `past_due` deve ser suspensa?
 *
 * Conta a partir de `updated_at`, que é quando o webhook marcou o vencimento.
 */
function shouldSuspendPastDue(userPlan, now = new Date(), graceDays = DEFAULT_GRACE_PERIOD_DAYS) {
  if (!userPlan || userPlan.status !== PLAN_STATUS.PAST_DUE) return false;

  const markedAt = userPlan.updatedAt ? new Date(userPlan.updatedAt) : null;
  if (!markedAt || Number.isNaN(markedAt.getTime())) return false;

  const deadline = new Date(markedAt);
  deadline.setDate(deadline.getDate() + graceDays);
  return now >= deadline;
}

/**
 * Uma assinatura cancelada já passou do período pago?
 *
 * Cancelar não corta na hora — o usuário pagou o mês.
 */
function shouldExpireCanceled(userPlan, now = new Date()) {
  if (!userPlan || !userPlan.plan_canceled) return false;
  if (userPlan.status === PLAN_STATUS.EXPIRED) return false;
  if (!userPlan.plan_finish_at) return false;

  const finishAt = new Date(userPlan.plan_finish_at);
  if (Number.isNaN(finishAt.getTime())) return false;
  return now >= finishAt;
}

/** Usuário e nome do plano vêm no mesmo SELECT porque o aviso precisa dos dois. */
const NOTICE_INCLUDE = [
  {
    model: User,
    as: 'user',
    attributes: ['id', 'name', 'email'],
    required: false,
  },
  {
    model: Plans,
    as: 'plans',
    attributes: ['id', 'display_name', 'plan_name'],
    required: false,
  },
];

/**
 * O aviso é efeito colateral da transição: qualquer falha de e-mail não pode
 * reverter o status já gravado nem parar a varredura dos outros usuários.
 */
async function notifyTransition(userPlan, kind) {
  try {
    const result = await sendPlanNotice({
      kind,
      user: userPlan.user,
      // `display_name` primeiro: `plan_name` é slug interno (`pro_mensal`) e
      // não é o nome que o assinante conhece.
      planName: userPlan.plans?.display_name || userPlan.plans?.plan_name,
    });
    return result?.sent ? 1 : 0;
  } catch (error) {
    console.error(
      `[PlanSuspension] Falha ao avisar usuário ${userPlan?.user_id}:`,
      error.message
    );
    return 0;
  }
}

/**
 * Varre os planos e aplica as duas transições, avisando o assinante em cada uma.
 * @returns {Promise<{ suspended: number, expired: number, notified: number }>}
 */
async function processPlanSuspensions(now = new Date()) {
  const graceDays = resolveGracePeriodDays();
  let suspended = 0;
  let expired = 0;
  let notified = 0;

  const pastDuePlans = await UserPlans.findAll({
    where: { status: PLAN_STATUS.PAST_DUE },
    include: NOTICE_INCLUDE,
  });
  for (const userPlan of pastDuePlans) {
    if (shouldSuspendPastDue(userPlan, now, graceDays)) {
      await userPlan.update({ status: PLAN_STATUS.SUSPENDED });
      suspended += 1;
      notified += await notifyTransition(
        userPlan,
        PLAN_NOTICE_KINDS.SUSPENDED
      );
    }
  }

  const canceledPlans = await UserPlans.findAll({
    where: {
      plan_canceled: true,
      status: { [Op.ne]: PLAN_STATUS.EXPIRED },
    },
    include: NOTICE_INCLUDE,
  });
  for (const userPlan of canceledPlans) {
    if (shouldExpireCanceled(userPlan, now)) {
      await userPlan.update({ status: PLAN_STATUS.EXPIRED });
      expired += 1;
      notified += await notifyTransition(userPlan, PLAN_NOTICE_KINDS.EXPIRED);
    }
  }

  return { suspended, expired, notified };
}

module.exports = {
  DEFAULT_GRACE_PERIOD_DAYS,
  resolveGracePeriodDays,
  shouldSuspendPastDue,
  shouldExpireCanceled,
  processPlanSuspensions,
};
