/**
 * Limite diário de downloads (plano free).
 * Contador em `plans_download_limits` — nunca confiar só no front.
 *
 * @see docs/contextos/download-daily-limit.md
 */

const { User, UserPlans, Plans, PlansDownloadLimits } = require('../../models');

/** Default free quando plano não tem count_downloads válido. */
const DEFAULT_FREE_DAILY_LIMIT = 3;

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

function resolveDailyLimit(plan) {
  if (plan && !isFreeMeteredPlan(plan.plan_name)) {
    return null; // ilimitado
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

function buildQuotaPayload({
  used,
  limit,
  unlimited,
  skippedReason,
}) {
  const remaining =
    unlimited || limit == null ? null : Math.max(0, limit - used);
  return {
    used: unlimited ? 0 : used,
    limit: unlimited ? null : limit,
    remaining,
    unlimited: Boolean(unlimited),
    skipped_reason: skippedReason || null,
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
        attributes: ['id', 'plan_name', 'count_downloads'],
      },
    ],
  });

  const plan = userPlan?.plans || null;
  const dailyLimit = resolveDailyLimit(plan);

  if (dailyLimit == null) {
    return {
      ok: true,
      data: buildQuotaPayload({
        used: 0,
        limit: null,
        unlimited: true,
        skippedReason: 'paid_plan',
      }),
    };
  }

  let row = await PlansDownloadLimits.findOne({ where: { user_id: id } });
  if (row && shouldResetDailyLimit(row.updatedAt)) {
    await row.destroy();
    row = null;
  }

  const used = row ? Number(row.current_count_downloads) || 0 : 0;

  return {
    ok: true,
    data: buildQuotaPayload({
      used,
      limit: dailyLimit,
      unlimited: false,
      skippedReason: null,
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
        attributes: ['id', 'plan_name', 'count_downloads'],
      },
    ],
  });

  const plan = userPlan?.plans || null;
  const dailyLimit = resolveDailyLimit(plan);

  if (dailyLimit == null) {
    return {
      ok: true,
      data: buildQuotaPayload({
        used: 0,
        limit: null,
        unlimited: true,
        skippedReason: 'paid_plan',
      }),
    };
  }

  let row = await PlansDownloadLimits.findOne({ where: { user_id: id } });

  if (row && shouldResetDailyLimit(row.updatedAt)) {
    await row.destroy();
    row = null;
  }

  const used = row ? Number(row.current_count_downloads) || 0 : 0;

  if (used >= dailyLimit) {
    return {
      ok: false,
      status: 400,
      message: 'Você usou o limite de downloads diários',
      data: buildQuotaPayload({
        used,
        limit: dailyLimit,
        unlimited: false,
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

  const newUsed = Number(row.current_count_downloads) || used + 1;

  return {
    ok: true,
    data: buildQuotaPayload({
      used: newUsed,
      limit: dailyLimit,
      unlimited: false,
    }),
  };
}

module.exports = {
  DEFAULT_FREE_DAILY_LIMIT,
  isFreeMeteredPlan,
  resolveDailyLimit,
  shouldResetDailyLimit,
  getDailyDownloadQuota,
  assertAndConsumeDailyDownload,
};
