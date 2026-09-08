/**
 * Regras puras do módulo Asaas — sem rede, sem banco.
 *
 * Aqui mora a tradução entre o vocabulário do Designflix (centavos, `month`,
 * `plans.id`) e o do Asaas (reais decimais, `MONTHLY`, `externalReference`).
 *
 * Convenção: constantes `ASAAS_*`, funções com sufixo `Asaas`.
 */

const ASAAS_CYCLES = {
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
};

const ASAAS_BILLING_TYPES = {
  CREDIT_CARD: 'CREDIT_CARD',
  PIX: 'PIX',
  BOLETO: 'BOLETO',
  /** Deixa o pagador escolher na fatura hospedada. */
  UNDEFINED: 'UNDEFINED',
};

/** `POST /transfers` aceita vários tipos; o saque do colaborador é sempre Pix. */
const ASAAS_TRANSFER_OPERATION_PIX = 'PIX';

const ASAAS_SUBSCRIPTION_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  EXPIRED: 'EXPIRED',
};

/** Eventos de webhook que este módulo trata. */
const ASAAS_EVENTS = {
  PAYMENT_CREATED: 'PAYMENT_CREATED',
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  PAYMENT_OVERDUE: 'PAYMENT_OVERDUE',
  PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',
  PAYMENT_DELETED: 'PAYMENT_DELETED',
  PAYMENT_CHARGEBACK_REQUESTED: 'PAYMENT_CHARGEBACK_REQUESTED',
  SUBSCRIPTION_DELETED: 'SUBSCRIPTION_DELETED',
  SUBSCRIPTION_INACTIVATED: 'SUBSCRIPTION_INACTIVATED',
};

/** `plans.billing_interval` → ciclo do Asaas. */
const ASAAS_CYCLE_BY_INTERVAL = {
  month: ASAAS_CYCLES.MONTHLY,
  year: ASAAS_CYCLES.YEARLY,
};

/**
 * Evento do Asaas → `user_plans.status`.
 *
 * `PAYMENT_OVERDUE` vira `past_due` e não `suspended` de propósito: vencer não
 * corta acesso na hora, quem corta é o job de suspensão depois da tolerância.
 */
const ASAAS_PLAN_STATUS_BY_EVENT = {
  [ASAAS_EVENTS.PAYMENT_CONFIRMED]: 'active',
  [ASAAS_EVENTS.PAYMENT_RECEIVED]: 'active',
  [ASAAS_EVENTS.PAYMENT_OVERDUE]: 'past_due',
  [ASAAS_EVENTS.PAYMENT_REFUNDED]: 'canceled',
  [ASAAS_EVENTS.PAYMENT_CHARGEBACK_REQUESTED]: 'suspended',
  [ASAAS_EVENTS.SUBSCRIPTION_DELETED]: 'canceled',
  [ASAAS_EVENTS.SUBSCRIPTION_INACTIVATED]: 'canceled',
};

function resolveCycleAsaas(billingInterval) {
  const key = String(billingInterval || '')
    .trim()
    .toLowerCase();
  return ASAAS_CYCLE_BY_INTERVAL[key] || null;
}

function resolveBillingTypeAsaas(billingType) {
  const key = String(billingType || '')
    .trim()
    .toUpperCase();
  return ASAAS_BILLING_TYPES[key] || null;
}

function resolvePlanStatusForEventAsaas(eventName) {
  const key = String(eventName || '')
    .trim()
    .toUpperCase();
  return ASAAS_PLAN_STATUS_BY_EVENT[key] || null;
}

/** Centavos → reais decimais, que é o formato que o Asaas aceita em `value`. */
function centsToValueAsaas(cents) {
  const parsed = Number(cents);
  if (!Number.isFinite(parsed)) return 0;
  return Number((Math.round(parsed) / 100).toFixed(2));
}

/** Reais decimais → centavos inteiros, para guardar no banco sem float. */
function valueToCentsAsaas(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

/** O Asaas espera `YYYY-MM-DD` em `nextDueDate`. */
function formatDueDateAsaas(date) {
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Soma ponderada usada nos dois dígitos verificadores. */
function weightedSum(digits, weights) {
  return weights.reduce(
    (total, weight, index) => total + Number(digits[index]) * weight,
    0
  );
}

/**
 * Valida CPF pelos dígitos verificadores.
 *
 * Conferir só o tamanho deixa passar `00000000000` e qualquer sequência
 * digitada errado. O erro então só aparece como 400 opaco do Asaas, no meio do
 * pagamento, sem dizer ao usuário qual campo está errado.
 */
function isValidCpfAsaas(digits) {
  if (!/^\d{11}$/.test(digits)) return false;
  // Todos os dígitos iguais passa na conta dos verificadores, mas não é CPF.
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const firstCheck = ((weightedSum(digits, [10, 9, 8, 7, 6, 5, 4, 3, 2]) * 10) % 11) % 10;
  if (firstCheck !== Number(digits[9])) return false;

  const secondCheck =
    ((weightedSum(digits, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]) * 10) % 11) % 10;
  return secondCheck === Number(digits[10]);
}

/** Valida CNPJ pelos dígitos verificadores. */
function isValidCnpjAsaas(digits) {
  if (!/^\d{14}$/.test(digits)) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const checkDigitAt = (weights) => {
    const remainder = weightedSum(digits, weights) % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstCheck = checkDigitAt([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (firstCheck !== Number(digits[12])) return false;

  const secondCheck = checkDigitAt([6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return secondCheck === Number(digits[13]);
}

/**
 * Normaliza e valida o documento.
 * @returns {string|null} só dígitos, ou `null` se inválido
 */
function sanitizeCpfCnpjAsaas(cpfCnpj) {
  const digits = String(cpfCnpj || '').replace(/\D/g, '');
  if (digits.length === 11) return isValidCpfAsaas(digits) ? digits : null;
  if (digits.length === 14) return isValidCnpjAsaas(digits) ? digits : null;
  return null;
}

/**
 * `externalReference` é o único campo livre que volta em todo webhook.
 * É por ele que a gente reencontra plano e usuário sem depender de lookup.
 */
function buildExternalReferenceAsaas({ planId, userId }) {
  return `plan:${planId};user:${userId}`;
}

function parseExternalReferenceAsaas(externalReference) {
  const result = { planId: null, userId: null };
  const raw = String(externalReference || '').trim();
  if (!raw) return result;

  raw.split(';').forEach((chunk) => {
    const [key, rawValue] = chunk.split(':');
    const value = String(rawValue ?? '').trim();
    // `Number('')` é 0 — sem esse guard um id vazio viraria id zero.
    if (!value) return;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) return;

    const normalizedKey = String(key || '').trim().toLowerCase();
    if (normalizedKey === 'plan') result.planId = parsed;
    if (normalizedKey === 'user') result.userId = parsed;
  });

  return result;
}

/**
 * Payload de cliente. O Asaas exige CPF/CNPJ tanto para cartão quanto para Pix.
 * @returns {{ ok: true, payload } | { ok: false, message }}
 */
function buildCustomerPayloadAsaas({ name, email, cpfCnpj, phone, postalCode }) {
  const sanitizedCpfCnpj = sanitizeCpfCnpjAsaas(cpfCnpj);
  if (!sanitizedCpfCnpj) {
    return { ok: false, message: 'CPF/CNPJ inválido' };
  }
  if (!String(name || '').trim()) {
    return { ok: false, message: 'Nome é obrigatório' };
  }
  if (!String(email || '').trim()) {
    return { ok: false, message: 'E-mail é obrigatório' };
  }

  const asaasPayload = {
    name: String(name).trim(),
    email: String(email).trim(),
    cpfCnpj: sanitizedCpfCnpj,
  };
  const sanitizedPhone = String(phone || '').replace(/\D/g, '');
  if (sanitizedPhone) asaasPayload.mobilePhone = sanitizedPhone;
  const sanitizedPostalCode = String(postalCode || '').replace(/\D/g, '');
  if (sanitizedPostalCode) asaasPayload.postalCode = sanitizedPostalCode;

  return { ok: true, payload: asaasPayload };
}

/**
 * Payload de assinatura recorrente.
 *
 * O Asaas não tem catálogo remoto: `value` e `cycle` viajam em cada assinatura,
 * e a fonte de verdade continua sendo a tabela `plans`.
 *
 * @returns {{ ok: true, payload } | { ok: false, message }}
 */
function buildSubscriptionPayloadAsaas({
  asaasCustomerId,
  plan,
  userId,
  billingType,
  nextDueDate,
  description,
  creditCardToken,
  remoteIp,
}) {
  if (!String(asaasCustomerId || '').trim()) {
    return { ok: false, message: 'Cliente Asaas é obrigatório' };
  }
  if (!plan || !plan.id) {
    return { ok: false, message: 'Plano inválido' };
  }

  const priceCents = Number(plan.price_cents);
  if (!Number.isInteger(priceCents) || priceCents <= 0) {
    return { ok: false, message: 'Plano sem preço válido para cobrança' };
  }

  const asaasCycle = resolveCycleAsaas(plan.billing_interval);
  if (!asaasCycle) {
    return { ok: false, message: 'Periodicidade do plano inválida' };
  }

  const asaasBillingType =
    resolveBillingTypeAsaas(billingType) || ASAAS_BILLING_TYPES.UNDEFINED;

  const asaasDueDate = formatDueDateAsaas(nextDueDate || new Date());
  if (!asaasDueDate) {
    return { ok: false, message: 'Data de vencimento inválida' };
  }

  const asaasPayload = {
    customer: String(asaasCustomerId).trim(),
    billingType: asaasBillingType,
    cycle: asaasCycle,
    value: centsToValueAsaas(priceCents),
    nextDueDate: asaasDueDate,
    description:
      description || `Assinatura ${plan.display_name || plan.plan_name}`,
    externalReference: buildExternalReferenceAsaas({
      planId: plan.id,
      userId,
    }),
  };

  if (asaasBillingType === ASAAS_BILLING_TYPES.CREDIT_CARD) {
    const token = String(creditCardToken || '').trim();
    if (!token) {
      return { ok: false, message: 'Cartão não tokenizado' };
    }
    asaasPayload.creditCardToken = token;
    // O Asaas exige o IP do pagador em cobrança de cartão (antifraude).
    const ip = String(remoteIp || '').trim();
    if (ip) asaasPayload.remoteIp = ip;
  }

  return { ok: true, payload: asaasPayload };
}

/**
 * Payload de tokenização de cartão.
 *
 * Os campos são copiados **um por um** de propósito. Espalhar o corpo da
 * request aqui faria qualquer chave extra enviada pelo cliente vazar para o
 * Asaas — e num payload que carrega número de cartão isso é o pior lugar
 * possível para ter campo surpresa.
 *
 * @returns {{ ok: true, payload } | { ok: false, message }}
 */
function buildTokenizePayloadAsaas({
  asaasCustomerId,
  holderName,
  number,
  expiryMonth,
  expiryYear,
  ccv,
  holder = {},
  remoteIp,
}) {
  if (!String(asaasCustomerId || '').trim()) {
    return { ok: false, message: 'Cliente Asaas é obrigatório' };
  }

  const cardNumber = String(number || '').replace(/\D/g, '');
  if (cardNumber.length < 13 || cardNumber.length > 19) {
    return { ok: false, message: 'Número do cartão inválido' };
  }

  const cardHolderName = String(holderName || '').trim();
  if (!cardHolderName) {
    return { ok: false, message: 'Nome impresso no cartão é obrigatório' };
  }

  const month = String(expiryMonth || '').replace(/\D/g, '').padStart(2, '0');
  if (!/^(0[1-9]|1[0-2])$/.test(month)) {
    return { ok: false, message: 'Mês de validade inválido' };
  }

  const year = String(expiryYear || '').replace(/\D/g, '');
  if (!/^\d{4}$/.test(year)) {
    return { ok: false, message: 'Ano de validade inválido' };
  }

  const securityCode = String(ccv || '').replace(/\D/g, '');
  if (securityCode.length < 3 || securityCode.length > 4) {
    return { ok: false, message: 'Código de segurança inválido' };
  }

  const holderDocument = sanitizeCpfCnpjAsaas(holder.cpfCnpj);
  if (!holderDocument) {
    return { ok: false, message: 'CPF do titular inválido' };
  }

  const holderPostalCode = String(holder.postalCode || '').replace(/\D/g, '');
  if (holderPostalCode.length !== 8) {
    return { ok: false, message: 'CEP do titular inválido' };
  }

  const holderAddressNumber = String(holder.addressNumber || '').trim();
  if (!holderAddressNumber) {
    return { ok: false, message: 'Número do endereço é obrigatório' };
  }

  const holderPhone = String(holder.phone || '').replace(/\D/g, '');
  if (holderPhone.length < 10) {
    return { ok: false, message: 'Telefone do titular inválido' };
  }

  if (!String(holder.name || '').trim()) {
    return { ok: false, message: 'Nome do titular é obrigatório' };
  }
  if (!String(holder.email || '').trim()) {
    return { ok: false, message: 'E-mail do titular é obrigatório' };
  }

  const asaasPayload = {
    customer: String(asaasCustomerId).trim(),
    creditCard: {
      holderName: cardHolderName,
      number: cardNumber,
      expiryMonth: month,
      expiryYear: year,
      ccv: securityCode,
    },
    creditCardHolderInfo: {
      name: String(holder.name).trim(),
      email: String(holder.email).trim(),
      cpfCnpj: holderDocument,
      postalCode: holderPostalCode,
      addressNumber: holderAddressNumber,
      phone: holderPhone,
    },
  };

  const ip = String(remoteIp || '').trim();
  if (ip) asaasPayload.remoteIp = ip;

  return { ok: true, payload: asaasPayload };
}

/**
 * Payload de transferência Pix (saque do colaborador).
 *
 * Campos copiados um a um, como nos outros builders: o que vai para o Asaas
 * aqui é ordem de pagamento, e chave extra vinda do cliente não pode passear
 * junto.
 *
 * @returns {{ ok: true, payload } | { ok: false, message }}
 */
function buildTransferPayloadAsaas({
  valueCents,
  pixKey,
  pixKeyType,
  description,
}) {
  const cents = Number(valueCents);
  if (!Number.isFinite(cents) || Math.round(cents) <= 0) {
    return { ok: false, message: 'Valor da transferência inválido' };
  }

  const asaasPixKey = String(pixKey || '').trim();
  if (!asaasPixKey) {
    return { ok: false, message: 'Chave Pix é obrigatória' };
  }

  const asaasPayload = {
    value: centsToValueAsaas(cents),
    operationType: ASAAS_TRANSFER_OPERATION_PIX,
    pixAddressKey: asaasPixKey,
  };

  const asaasPixKeyType = String(pixKeyType || '').trim().toUpperCase();
  if (asaasPixKeyType) asaasPayload.pixAddressKeyType = asaasPixKeyType;

  const asaasDescription = String(description || '').trim();
  if (asaasDescription) asaasPayload.description = asaasDescription;

  return { ok: true, payload: asaasPayload };
}

module.exports = {
  ASAAS_CYCLES,
  ASAAS_BILLING_TYPES,
  ASAAS_TRANSFER_OPERATION_PIX,
  ASAAS_SUBSCRIPTION_STATUS,
  ASAAS_EVENTS,
  ASAAS_CYCLE_BY_INTERVAL,
  ASAAS_PLAN_STATUS_BY_EVENT,
  resolveCycleAsaas,
  resolveBillingTypeAsaas,
  resolvePlanStatusForEventAsaas,
  centsToValueAsaas,
  valueToCentsAsaas,
  formatDueDateAsaas,
  isValidCpfAsaas,
  isValidCnpjAsaas,
  sanitizeCpfCnpjAsaas,
  buildExternalReferenceAsaas,
  parseExternalReferenceAsaas,
  buildCustomerPayloadAsaas,
  buildSubscriptionPayloadAsaas,
  buildTokenizePayloadAsaas,
  buildTransferPayloadAsaas,
};
