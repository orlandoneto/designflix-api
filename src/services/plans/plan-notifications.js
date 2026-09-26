/**
 * Avisos por e-mail do ciclo de assinatura.
 *
 * O gateway manda os avisos de cobrança dele; aqui saem os avisos de acesso
 * (venceu, suspendeu, expirou, cancelou). O texto é montado por uma função
 * pura e o envio é sempre tolerante a falha — quem chama é cron e webhook.
 *
 * @see docs/contextos/plans.md
 */

const { sendEmail } = require('../../utils/emailService');

/** Template `.hbs` em `src/views/`. */
const PLAN_NOTICE_TEMPLATE = 'planStatusNotice';

/** Tipos de aviso do ciclo de assinatura. */
const PLAN_NOTICE_KINDS = {
  PAST_DUE: 'past_due',
  SUSPENDED: 'suspended',
  EXPIRED: 'expired',
  CANCELED: 'canceled',
};

const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(value) {
  return String(value).padStart(2, '0');
}

/**
 * Formata `accessUntil` em dd/mm/aaaa.
 *
 * String de data sem hora ("2026-10-07", formato do Asaas) é lida pelo regex e
 * nunca por `new Date`: o parse em UTC volta um dia no fuso do Brasil.
 */
function formatAccessUntil(accessUntil) {
  if (!accessUntil) return '';

  if (accessUntil instanceof Date) {
    if (Number.isNaN(accessUntil.getTime())) return '';
    return `${pad2(accessUntil.getDate())}/${pad2(
      accessUntil.getMonth() + 1
    )}/${accessUntil.getFullYear()}`;
  }

  const raw = String(accessUntil).trim().slice(0, 10);
  const match = ISO_DATE_ONLY.exec(raw);
  if (!match) return '';

  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

function resolveUserName(userName) {
  const name = String(userName || '').trim();
  return name || 'assinante';
}

function resolvePlanPhrase(planName) {
  const name = String(planName || '').trim();
  return name ? `plano ${name}` : 'plano';
}

function resolveInvoiceUrl(invoiceUrl) {
  const url = String(invoiceUrl || '').trim();
  return url || '';
}

function buildPastDueTexts(planPhrase, invoiceUrl) {
  return {
    subject: 'ON Graph - Cobrança vencida',
    headline: 'A cobrança do seu plano venceu',
    message: `Não identificamos o pagamento da última cobrança do seu ${planPhrase}. Seu acesso continua liberado por alguns dias enquanto aguardamos a confirmação.`,
    nextStep: invoiceUrl
      ? 'Pague a fatura pelo link abaixo para não perder o acesso. Se já pagou, desconsidere este e-mail.'
      : 'Regularize o pagamento para não perder o acesso. Se já pagou, desconsidere este e-mail.',
    actionLabel: invoiceUrl ? 'Pagar fatura' : '',
  };
}

function buildSuspendedTexts(planPhrase, invoiceUrl) {
  return {
    subject: 'ON Graph - Acesso suspenso',
    headline: 'Seu acesso foi suspenso',
    message: `Seu acesso ao ${planPhrase} foi suspenso porque a cobrança em aberto não foi paga. Seus dados e downloads continuam salvos.`,
    nextStep: invoiceUrl
      ? 'Pague a fatura em aberto pelo link abaixo para liberar o acesso.'
      : 'Pague a fatura em aberto para liberar o acesso. Em caso de dúvida, fale com o suporte.',
    actionLabel: invoiceUrl ? 'Pagar fatura' : '',
  };
}

function buildExpiredTexts(planPhrase) {
  return {
    subject: 'ON Graph - Plano encerrado',
    headline: 'O período pago do seu plano terminou',
    message: `O período já pago do seu ${planPhrase} chegou ao fim e sua conta voltou para o plano gratuito.`,
    nextStep:
      'Você continua com o acesso gratuito. Para ter acesso completo de novo, assine um plano quando quiser.',
    actionLabel: '',
  };
}

function buildCanceledTexts(planPhrase, accessUntilLabel) {
  return {
    subject: 'ON Graph - Cancelamento confirmado',
    headline: 'Seu cancelamento foi confirmado',
    message: `Confirmamos o cancelamento do seu ${planPhrase}. Você não será cobrado novamente.`,
    nextStep: accessUntilLabel
      ? `Seu acesso continua até ${accessUntilLabel}. Depois dessa data, a conta passa para o plano gratuito.`
      : 'Seu acesso continua até o fim do período já pago. Depois disso, a conta passa para o plano gratuito.',
    actionLabel: '',
  };
}

/**
 * Monta o texto do aviso. Pura: não faz I/O nem lê env.
 *
 * @param {{ kind: string, userName?: string, planName?: string, accessUntil?: string|Date, invoiceUrl?: string }} params
 * @returns {{ ok: true, subject: string, description: string, context: object } | { ok: false, message: string }}
 */
function buildPlanNotice({
  kind,
  userName,
  planName,
  accessUntil,
  invoiceUrl,
} = {}) {
  const planPhrase = resolvePlanPhrase(planName);
  const accessUntilLabel = formatAccessUntil(accessUntil);
  const url = resolveInvoiceUrl(invoiceUrl);

  let texts;
  switch (kind) {
    case PLAN_NOTICE_KINDS.PAST_DUE:
      texts = buildPastDueTexts(planPhrase, url);
      break;
    case PLAN_NOTICE_KINDS.SUSPENDED:
      texts = buildSuspendedTexts(planPhrase, url);
      break;
    case PLAN_NOTICE_KINDS.EXPIRED:
      texts = buildExpiredTexts(planPhrase);
      break;
    case PLAN_NOTICE_KINDS.CANCELED:
      texts = buildCanceledTexts(planPhrase, accessUntilLabel);
      break;
    default:
      return { ok: false, message: `Tipo de aviso desconhecido: ${kind}` };
  }

  return {
    ok: true,
    subject: texts.subject,
    description: `${texts.message} ${texts.nextStep}`,
    context: {
      kind,
      name: resolveUserName(userName),
      planName: String(planName || '').trim(),
      headline: texts.headline,
      message: texts.message,
      nextStep: texts.nextStep,
      actionLabel: texts.actionLabel,
      invoiceUrl: url,
      accessUntil: accessUntilLabel,
    },
  };
}

/**
 * Monta e envia o aviso. Nunca estoura para o chamador.
 *
 * @param {{ kind: string, user?: object, planName?: string, accessUntil?: string|Date, invoiceUrl?: string }} params
 * @returns {Promise<{ sent: boolean, kind?: string, reason?: string }>}
 */
async function sendPlanNotice({
  kind,
  user,
  planName,
  accessUntil,
  invoiceUrl,
} = {}) {
  const email = String(user?.email || '').trim();
  if (!email) {
    return { sent: false, reason: 'sem e-mail' };
  }

  const notice = buildPlanNotice({
    kind,
    userName: user?.name,
    planName,
    accessUntil,
    invoiceUrl,
  });
  if (!notice.ok) {
    return { sent: false, reason: notice.message };
  }

  try {
    await sendEmail(
      {
        email,
        title: notice.subject,
        description: notice.description,
      },
      PLAN_NOTICE_TEMPLATE,
      {
        ...notice.context,
        baseUrl: process.env.API_URL || process.env.APP_URL,
        year: new Date().getFullYear(),
      }
    );
    return { sent: true, kind };
  } catch (error) {
    // E-mail que falha não pode derrubar o cron nem o webhook que chamou.
    console.error(
      `[PlanNotice] Falha ao enviar aviso "${kind}" para ${email}:`,
      error.message
    );
    return { sent: false, reason: 'falha no envio' };
  }
}

module.exports = {
  PLAN_NOTICE_TEMPLATE,
  PLAN_NOTICE_KINDS,
  formatAccessUntil,
  buildPlanNotice,
  sendPlanNotice,
};
