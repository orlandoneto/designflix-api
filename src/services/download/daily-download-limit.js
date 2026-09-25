/**
 * Limite diário de downloads (plano free).
 * Contador em `plans_download_limits` — nunca confiar só no front.
 *
 * @see docs/contextos/download-daily-limit.md
 */

const { User, UserPlans, Plans, PlansDownloadLimits } = require('../../models');
const { resolveMonthlyDownloadCap } = require('../plans/plans-rules');

/** Default free quando plano não tem count_downloads válido. */
const DEFAULT_FREE_DAILY_LIMIT = 3;

/** Estados possíveis de `user_plans.status`. */
const PLAN_STATUS = {
  /** Assinatura criada, primeiro pagamento ainda não confirmado. */
  PENDING: 'pending',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  SUSPENDED: 'suspended',
  CANCELED: 'canceled',
  EXPIRED: 'expired',
};

/**
 * Status que ainda dão direito ao benefício do plano pago.
 *
 * `past_due` continua liberado de propósito: é a janela de tolerância entre a
 * cobrança vencer e o acesso ser cortado. Quem corta é o job que promove
 * `past_due` → `suspended`, não este módulo.
 *
 * `pending` fica de fora: criar assinatura não confirma pagamento, e no Pix o
 * Pix pode nunca ser pago. Acesso só depois do webhook de confirmação.
 */
const ENTITLED_PLAN_STATUSES = new Set([
  PLAN_STATUS.ACTIVE,
  PLAN_STATUS.PAST_DUE,
]);

/**
 * Status vazio = linha anterior à coluna `status`. Mantém o comportamento
 * antigo (liberado) em vez de trancar usuário legítimo por backfill incompleto.
 */
function isEntitledPlanStatus(status) {
  const value = String(status || '')
    .trim()
    .toLowerCase();
  if (!value) return true;
  return ENTITLED_PLAN_STATUSES.has(value);
}

/**
 * Plano free / sem plano pago → metered.
 * Nomes pagos (monthly, pro, etc.) → ilimitado.
 */
function isFreeMeteredPlan(planName) {
  const name = String(planName || '')
    .trim()
    .toLowerCase();
  if (!name) return true;
  if (name.includes('free') || name.includes('gratuito')) return true;
  return false;
}

/**
 * @param {object|null} plan — linha de `plans`
 * @param {string} [planStatus] — `user_plans.status`
 * @returns {number|null} null = ilimitado
 */
function resolveDailyLimit(plan, planStatus) {
  const isPaidPlan = Boolean(plan) && !isFreeMeteredPlan(plan.plan_name);

  if (isPaidPlan) {
    if (isEntitledPlanStatus(planStatus)) {
      return null; // ilimitado
    }
    // Assinante suspenso/cancelado cai na régua do free — e não no
    // `count_downloads` do plano pago, que costuma ser alto ou irrelevante.
    return DEFAULT_FREE_DAILY_LIMIT;
  }

  const fromPlan = Number(plan?.count_downloads);
  if (Number.isInteger(fromPlan) && fromPlan > 0) {
    return fromPlan;
  }
  return DEFAULT_FREE_DAILY_LIMIT;
}

/**
 * Reset ao virar o dia civil após o último update (meia-noite local do servidor).
 */
function shouldResetDailyLimit(updatedAt, now = new Date()) {
  if (!updatedAt) return false;
  const lastUpdate = new Date(updatedAt);
  if (Number.isNaN(lastUpdate.getTime())) return false;
  const nextMidnight = new Date(lastUpdate);
  nextMidnight.setHours(24, 0, 0, 0);
  return now >= nextMidnight;
}

/** Janela do contador mensal, no mesmo formato gravado na tabela. */
function resolveMonthlyPeriod(now = new Date()) {
  const date = now instanceof Date ? now : new Date(now);
  const reference = Number.isNaN(date.getTime()) ? new Date() : date;
  const month = String(reference.getMonth() + 1).padStart(2, '0');
  return `${reference.getFullYear()}-${month}`;
}

/** Contador diário de um dia anterior vale zero, mesmo antes de ser zerado. */
function resolveDailyUsage(row, now = new Date()) {
  if (!row) return 0;
  if (shouldResetDailyLimit(row.updatedAt, now)) return 0;
  return Number(row.current_count_downloads) || 0;
}

/** Contador de outro mês não conta: a janela virou e o teto zera. */
function resolveMonthlyUsage(row, now = new Date()) {
  if (!row) return 0;
  if (row.monthly_period !== resolveMonthlyPeriod(now)) return 0;
  return Number(row.monthly_count_downloads) || 0;
}

/**
 * `period` diz em qual janela o número deve ser lido: plano free é diário,
 * plano pago com teto é mensal. Sem isso o front não sabe se "3 de 5" é hoje
 * ou no mês.
 */
function buildQuotaPayload({
  used,
  limit,
  unlimited,
  skippedReason,
  planStatus,
  period = 'day',
}) {
  const remaining =
    unlimited || limit == null ? null : Math.max(0, limit - used);
  return {
    used: unlimited ? 0 : used,
    limit: unlimited ? null : limit,
    remaining,
    unlimited: Boolean(unlimited),
    period: unlimited ? null : period,
    skipped_reason: skippedReason || null,
    // Deixa o front explicar *por que* um assinante caiu no limite free.
    plan_status: planStatus || null,
  };
}

/**
 * Lê a linha do contador zerando o diário quando o dia virou.
 *
 * Zera em vez de apagar a linha: o contador mensal mora na mesma linha, e
 * apagar levaria o teto do mês junto — o assinante ganharia teto novo todo dia.
 */
async function loadLimitRow(userId, now = new Date()) {
  const row = await PlansDownloadLimits.findOne({ where: { user_id: userId } });
  if (!row) return null;

  if (
    shouldResetDailyLimit(row.updatedAt, now) &&
    Number(row.current_count_downloads) > 0
  ) {
    await row.update({ current_count_downloads: 0 });
  }
  return row;
}

/**
 * Consumo do plano pago: ilimitado por dia, mas com teto no mês.
 *
 * Sem teto o plano continua ilimitado, que é o comportamento histórico. Com
 * teto, bater o limite não suspende nada — só bloqueia até a virada do mês.
 */
async function consumeMonthlyCap(userId, plan, planStatus, now = new Date()) {
  const monthlyCap = resolveMonthlyDownloadCap(plan);
  if (monthlyCap == null) {
    return {
      ok: true,
      data: buildQuotaPayload({
        used: 0,
        limit: null,
        unlimited: true,
        skippedReason: 'paid_plan',
        planStatus,
      }),
    };
  }

  const row = await loadLimitRow(userId, now);
  const used = resolveMonthlyUsage(row, now);

  if (used >= monthlyCap) {
    return {
      ok: false,
      status: 400,
      message: 'Você atingiu o limite de downloads do seu plano neste mês',
      data: buildQuotaPayload({
        used,
        limit: monthlyCap,
        unlimited: false,
        planStatus,
        period: 'month',
      }),
    };
  }

  const period = resolveMonthlyPeriod(now);
  if (row) {
    await row.update({
      monthly_count_downloads: used + 1,
      monthly_period: period,
    });
  } else {
    await PlansDownloadLimits.create({
      user_id: userId,
      current_count_downloads: 0,
      monthly_count_downloads: 1,
      monthly_period: period,
    });
  }

  return {
    ok: true,
    data: buildQuotaPayload({
      used: used + 1,
      limit: monthlyCap,
      unlimited: false,
      planStatus,
      period: 'month',
    }),
  };
}

/**
 * Lê quota sem consumir.
 * @param {number} userId
 */
async function getDailyDownloadQuota(userId) {
  const id = Number(userId);
  if (!Number.isInteger(id) || id < 1) {
    return { ok: false, status: 400, message: 'Usuário inválido' };
  }

  const user = await User.findByPk(id, {
    attributes: ['id', 'partnerCode'],
  });
  if (!user) {
    return { ok: false, status: 404, message: 'Usuário não encontrado' };
  }

  if (user.partnerCode) {
    return {
      ok: true,
      data: buildQuotaPayload({
        used: 0,
        limit: null,
        unlimited: true,
        skippedReason: 'partner',
      }),
    };
  }

  const userPlan = await UserPlans.findOne({
    where: { user_id: id },
    include: [
      {
        model: Plans,
        as: 'plans',
        attributes: ['id', 'plan_name', 'count_downloads', 'monthly_download_cap'],
      },
    ],
  });

  const plan = userPlan?.plans || null;
  const planStatus = userPlan?.status || null;
  const dailyLimit = resolveDailyLimit(plan, planStatus);

  if (dailyLimit == null) {
    const monthlyCap = resolveMonthlyDownloadCap(plan);
    if (monthlyCap == null) {
      return {
        ok: true,
        data: buildQuotaPayload({
          used: 0,
          limit: null,
          unlimited: true,
          skippedReason: 'paid_plan',
          planStatus,
        }),
      };
    }

    const cappedRow = await loadLimitRow(id);
    return {
      ok: true,
      data: buildQuotaPayload({
        used: resolveMonthlyUsage(cappedRow),
        limit: monthlyCap,
        unlimited: false,
        skippedReason: null,
        planStatus,
        period: 'month',
      }),
    };
  }

  const row = await loadLimitRow(id);

  return {
    ok: true,
    data: buildQuotaPayload({
      used: resolveDailyUsage(row),
      limit: dailyLimit,
      unlimited: false,
      skippedReason: null,
      planStatus,
    }),
  };
}

/**
 * Valida e incrementa o contador diário (antes de emitir signed URL).
 * @param {number} userId — sempre do JWT (`req.params.userId`)
 * @returns {{ ok: true, data } | { ok: false, status, message }}
 */
async function assertAndConsumeDailyDownload(userId) {
  const id = Number(userId);
  if (!Number.isInteger(id) || id < 1) {
    return { ok: false, status: 400, message: 'Usuário inválido' };
  }

  const user = await User.findByPk(id, {
    attributes: ['id', 'partnerCode'],
  });
  if (!user) {
    return { ok: false, status: 404, message: 'Usuário não encontrado' };
  }

  if (user.partnerCode) {
    return {
      ok: true,
      data: buildQuotaPayload({
        used: 0,
        limit: null,
        unlimited: true,
        skippedReason: 'partner',
      }),
    };
  }

  const userPlan = await UserPlans.findOne({
    where: { user_id: id },
    include: [
      {
        model: Plans,
        as: 'plans',
        attributes: ['id', 'plan_name', 'count_downloads', 'monthly_download_cap'],
      },
    ],
  });

  const plan = userPlan?.plans || null;
  const planStatus = userPlan?.status || null;
  const dailyLimit = resolveDailyLimit(plan, planStatus);

  if (dailyLimit == null) {
    return consumeMonthlyCap(id, plan, planStatus);
  }

  let row = await loadLimitRow(id);
  const used = resolveDailyUsage(row);

  if (used >= dailyLimit) {
    return {
      ok: false,
      status: 400,
      message: 'Você usou o limite de downloads diários',
      data: buildQuotaPayload({
        used,
        limit: dailyLimit,
        unlimited: false,
        planStatus,
      }),
    };
  }

  if (row) {
    await row.update({
      current_count_downloads: used + 1,
      updatedAt: new Date(),
    });
  } else {
    row = await PlansDownloadLimits.create({
      user_id: id,
      current_count_downloads: 1,
    });
  }

  return {
    ok: true,
    data: buildQuotaPayload({
      used: used + 1,
      limit: dailyLimit,
      unlimited: false,
      planStatus,
    }),
  };
}

module.exports = {
  DEFAULT_FREE_DAILY_LIMIT,
  PLAN_STATUS,
  ENTITLED_PLAN_STATUSES,
  isEntitledPlanStatus,
  isFreeMeteredPlan,
  resolveDailyLimit,
  shouldResetDailyLimit,
  resolveDailyUsage,
  resolveMonthlyPeriod,
  resolveMonthlyUsage,
  getDailyDownloadQuota,
  assertAndConsumeDailyDownload,
};
