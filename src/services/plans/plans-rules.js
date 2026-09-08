/**
 * Regras puras do catálogo de planos — compartilhadas entre gateways.
 *
 * A tabela `plans` é a fonte de verdade do preço. O gateway (hoje Asaas) é
 * espelho: recebe o valor na hora de criar a assinatura e não guarda catálogo.
 *
 * @see docs/contextos/plans.md
 */

const PLAN_INTERVALS = ['month', 'year'];
const PLAN_GATEWAYS = ['asaas', 'stripe'];
const PLAN_CURRENCIES = ['BRL'];

/** Gateway default de plano pago novo. Stripe só sobrevive no legado. */
const DEFAULT_PLAN_GATEWAY = 'asaas';

const MAX_PLAN_FEATURES = 20;

/**
 * `plan_name` é chave interna (código, cupom, log, comparação de tier), por
 * isso o padrão é fechado: minúsculas, números e underscore.
 */
const PLAN_NAME_PATTERN = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;
const PLAN_NAME_MIN_LENGTH = 3;
const PLAN_NAME_MAX_LENGTH = 40;
const PLAN_NAME_HINT =
  'Use minúsculas, números e underscore (ex.: pro_mensal, studio_anual). ' +
  'Comece por letra, sem acento, espaço, hífen ou símbolo.';

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

/**
 * Corrige só o que é cosmético (espaço, underscore repetido, caixa). Acento e
 * símbolo continuam erro — quem cadastra precisa aprender o padrão.
 */
function normalizePlanName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * @returns {{ ok: true, value: string } | { ok: false, message: string }}
 */
function validatePlanName(value) {
  const planName = normalizePlanName(value);
  if (!planName) {
    return { ok: false, message: 'plan_name é obrigatório' };
  }
  if (planName.length < PLAN_NAME_MIN_LENGTH) {
    return {
      ok: false,
      message: `plan_name deve ter ao menos ${PLAN_NAME_MIN_LENGTH} caracteres`,
    };
  }
  if (planName.length > PLAN_NAME_MAX_LENGTH) {
    return {
      ok: false,
      message: `plan_name deve ter no máximo ${PLAN_NAME_MAX_LENGTH} caracteres`,
    };
  }
  if (!PLAN_NAME_PATTERN.test(planName)) {
    return { ok: false, message: `plan_name fora do padrão. ${PLAN_NAME_HINT}` };
  }
  return { ok: true, value: planName };
}

function normalizeGateway(gateway) {
  const normalized = normalizeSlug(gateway);
  return PLAN_GATEWAYS.includes(normalized) ? normalized : null;
}

/** Plano com preço > 0 precisa de gateway; plano gratuito não cobra nada. */
function isBillablePlan(plan) {
  const priceCents = Number(plan && plan.price_cents);
  return Number.isInteger(priceCents) && priceCents > 0;
}

/**
 * Teto mensal de downloads do plano pago.
 *
 * `null` = ilimitado, que é o comportamento histórico. Vazio e null são a mesma
 * coisa aqui: o admin manda string vazia quando limpa o campo.
 *
 * @returns {{ ok: true, value: number|null } | { ok: false, message: string }}
 */
function parseMonthlyDownloadCap(value) {
  if (value === undefined || value === null || value === '') {
    return { ok: true, value: null };
  }
  const cap = Number(value);
  if (!Number.isInteger(cap) || cap < 1) {
    return {
      ok: false,
      message: 'monthly_download_cap deve ser inteiro >= 1 ou vazio',
    };
  }
  return { ok: true, value: cap };
}

/** `null` no plano = sem teto. Assinante suspenso não chega aqui. */
function resolveMonthlyDownloadCap(plan) {
  const cap = Number(plan && plan.monthly_download_cap);
  return Number.isInteger(cap) && cap > 0 ? cap : null;
}

/**
 * Troca de plano é permitida?
 *
 * Só valida o destino e classifica a direção — quem cancela no gateway e cria a
 * assinatura nova é o service. Preço igual entre planos diferentes conta como
 * `lateral` (ex.: mensal por outro mensal do mesmo valor).
 *
 * @returns {{ ok: true, kind: 'upgrade'|'downgrade'|'lateral' } | { ok: false, message: string }}
 */
function validatePlanChange({ currentPlan, targetPlan } = {}) {
  if (!targetPlan || !targetPlan.id) {
    return { ok: false, message: 'Plano de destino inválido' };
  }
  if (!targetPlan.active) {
    return { ok: false, message: 'Plano indisponível' };
  }
  if (!isBillablePlan(targetPlan)) {
    return { ok: false, message: 'Plano de destino não é cobrado' };
  }
  if (normalizeGateway(targetPlan.gateway) !== DEFAULT_PLAN_GATEWAY) {
    return { ok: false, message: 'Plano de destino não é cobrado pelo Asaas' };
  }
  if (!currentPlan || !currentPlan.id) {
    return { ok: false, message: 'Você não tem assinatura ativa para trocar' };
  }
  if (Number(currentPlan.id) === Number(targetPlan.id)) {
    return { ok: false, message: 'Você já está neste plano' };
  }

  const currentPrice = Number(currentPlan.price_cents) || 0;
  const targetPrice = Number(targetPlan.price_cents) || 0;
  if (targetPrice > currentPrice) return { ok: true, kind: 'upgrade' };
  if (targetPrice < currentPrice) return { ok: true, kind: 'downgrade' };
  return { ok: true, kind: 'lateral' };
}

function parseFeatures(features) {
  if (Array.isArray(features)) {
    return features
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, MAX_PLAN_FEATURES);
  }
  if (typeof features === 'string') {
    return features
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, MAX_PLAN_FEATURES);
  }
  return [];
}

function formatPriceBRL(priceCents) {
  const cents = Number(priceCents) || 0;
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Valida e normaliza o corpo vindo do admin.
 * @returns {{ ok: true, value: object } | { ok: false, message: string }}
 */
function validatePlanBody(body = {}) {
  const planNameResult = validatePlanName(body.plan_name);
  if (!planNameResult.ok) {
    return { ok: false, message: planNameResult.message };
  }
  const planName = planNameResult.value;

  const displayName = String(body.display_name || '').trim();
  if (!displayName) {
    return { ok: false, message: 'display_name é obrigatório' };
  }

  const tier = normalizeSlug(body.tier);
  if (!tier) {
    return { ok: false, message: 'tier é obrigatório' };
  }

  const priceCents = Number(body.price_cents);
  if (!Number.isInteger(priceCents) || priceCents < 0) {
    return { ok: false, message: 'price_cents deve ser inteiro >= 0' };
  }

  const currency = String(body.currency || 'BRL')
    .trim()
    .toUpperCase();
  if (!PLAN_CURRENCIES.includes(currency)) {
    return { ok: false, message: 'currency não suportada' };
  }

  const billingInterval = normalizeSlug(body.billing_interval || 'month');
  if (!PLAN_INTERVALS.includes(billingInterval)) {
    return { ok: false, message: 'billing_interval deve ser month ou year' };
  }

  const countDownloads = Number(
    body.count_downloads === undefined ? 0 : body.count_downloads
  );
  if (!Number.isInteger(countDownloads) || countDownloads < 0) {
    return { ok: false, message: 'count_downloads deve ser inteiro >= 0' };
  }

  const sortOrder = Number(body.sort_order === undefined ? 0 : body.sort_order);
  if (!Number.isInteger(sortOrder)) {
    return { ok: false, message: 'sort_order deve ser inteiro' };
  }

  const monthlyCap = parseMonthlyDownloadCap(body.monthly_download_cap);
  if (!monthlyCap.ok) {
    return { ok: false, message: monthlyCap.message };
  }

  const billable = priceCents > 0;
  let gateway = normalizeGateway(body.gateway);
  if (billable) {
    // Plano pago sem gateway explícito nasce no Asaas.
    gateway = gateway || DEFAULT_PLAN_GATEWAY;
  } else {
    if (gateway) {
      return { ok: false, message: 'Plano gratuito não tem gateway' };
    }
    gateway = null;
  }

  return {
    ok: true,
    value: {
      plan_name: planName,
      display_name: displayName,
      tier,
      price_cents: priceCents,
      currency,
      billing_interval: billingInterval,
      count_downloads: countDownloads,
      // Teto mensal só existe para plano pago: no free quem limita é o diário.
      monthly_download_cap: billable ? monthlyCap.value : null,
      features: parseFeatures(body.features),
      sort_order: sortOrder,
      active: body.active === undefined ? true : Boolean(body.active),
      gateway,
    },
  };
}

/** Visão do admin: mostra tudo, inclusive o legado da Stripe. */
function mapPlanAdmin(plan) {
  if (!plan) return null;
  return {
    id: plan.id,
    planName: plan.plan_name,
    displayName: plan.display_name,
    tier: plan.tier,
    priceCents: Number(plan.price_cents) || 0,
    priceFormatted: formatPriceBRL(plan.price_cents),
    currency: plan.currency,
    billingInterval: plan.billing_interval,
    countDownloads: Number(plan.count_downloads) || 0,
    monthlyDownloadCap: resolveMonthlyDownloadCap(plan),
    features: plan.features || [],
    sortOrder: Number(plan.sort_order) || 0,
    active: Boolean(plan.active),
    gateway: plan.gateway || null,
    billable: isBillablePlan(plan),
    /** Só leitura: plano herdado do período Stripe. */
    legacyStripePriceId: plan.stripe_price_id || null,
    createdAt: plan.createdAt || null,
    updatedAt: plan.updatedAt || null,
  };
}

/**
 * Visão pública: sem nada de gateway. O site faz checkout por `plans.id`,
 * então trocar de gateway não muda o contrato do front.
 */
function mapPlanPublic(plan) {
  if (!plan) return null;
  return {
    id: plan.id,
    tier: plan.tier,
    name: plan.display_name || plan.plan_name,
    priceCents: Number(plan.price_cents) || 0,
    priceFormatted: formatPriceBRL(plan.price_cents),
    currency: plan.currency,
    billingInterval: plan.billing_interval,
    countDownloads: Number(plan.count_downloads) || 0,
    monthlyDownloadCap: resolveMonthlyDownloadCap(plan),
    features: plan.features || [],
    sortOrder: Number(plan.sort_order) || 0,
    billable: isBillablePlan(plan),
  };
}

module.exports = {
  PLAN_INTERVALS,
  PLAN_GATEWAYS,
  PLAN_CURRENCIES,
  DEFAULT_PLAN_GATEWAY,
  MAX_PLAN_FEATURES,
  PLAN_NAME_PATTERN,
  PLAN_NAME_MIN_LENGTH,
  PLAN_NAME_MAX_LENGTH,
  PLAN_NAME_HINT,
  normalizePlanName,
  validatePlanName,
  normalizeGateway,
  isBillablePlan,
  parseMonthlyDownloadCap,
  resolveMonthlyDownloadCap,
  validatePlanChange,
  parseFeatures,
  formatPriceBRL,
  validatePlanBody,
  mapPlanAdmin,
  mapPlanPublic,
};
