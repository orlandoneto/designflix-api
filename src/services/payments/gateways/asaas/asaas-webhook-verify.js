/**
 * Autenticação do webhook do Asaas.
 *
 * O Asaas não assina o corpo como a Stripe faz. Ele devolve um token estático
 * no header `asaas-access-token`, configurado por você no painel. A conferência
 * é feita em tempo constante para não vazar o token por timing.
 */

const crypto = require('crypto');
const { resolveWebhookTokenAsaas } = require('./asaas-config');

const ASAAS_WEBHOOK_TOKEN_HEADER = 'asaas-access-token';

/** Token curto demais é erro de configuração, não segredo. */
const ASAAS_WEBHOOK_TOKEN_MIN_LENGTH = 16;

function safeEqualAsaas(received, expected) {
  const receivedBuffer = Buffer.from(String(received), 'utf8');
  const expectedBuffer = Buffer.from(String(expected), 'utf8');
  if (receivedBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

/** Escape hatch de desenvolvimento — nunca deve estar ligado em produção. */
function allowsUnverifiedAsaas() {
  return (
    String(process.env.ASAAS_WEBHOOK_ALLOW_UNVERIFIED || '')
      .trim()
      .toLowerCase() === 'true' && process.env.NODE_ENV !== 'production'
  );
}

/**
 * @param {object} req — precisa de `headers` e `body`
 * @returns {{ ok: true, event } | { ok: false, status: number, message: string }}
 */
function verifyWebhookAsaas(req) {
  const asaasBody = req && req.body;
  if (!asaasBody || typeof asaasBody !== 'object') {
    return { ok: false, status: 400, message: 'Corpo do evento inválido' };
  }
  if (!String(asaasBody.event || '').trim()) {
    return { ok: false, status: 400, message: 'Evento sem nome' };
  }

  const asaasExpectedToken = resolveWebhookTokenAsaas();

  if (!asaasExpectedToken) {
    if (allowsUnverifiedAsaas()) {
      return { ok: true, event: asaasBody };
    }
    return {
      ok: false,
      status: 500,
      message: 'Webhook do Asaas não configurado',
    };
  }

  if (asaasExpectedToken.length < ASAAS_WEBHOOK_TOKEN_MIN_LENGTH) {
    return {
      ok: false,
      status: 500,
      message: 'Webhook do Asaas não configurado',
    };
  }

  const headers = req.headers || {};
  const asaasReceivedToken = String(
    headers[ASAAS_WEBHOOK_TOKEN_HEADER] ||
      headers[ASAAS_WEBHOOK_TOKEN_HEADER.toUpperCase()] ||
      ''
  ).trim();

  if (!asaasReceivedToken) {
    return { ok: false, status: 400, message: 'Token do webhook ausente' };
  }
  if (!safeEqualAsaas(asaasReceivedToken, asaasExpectedToken)) {
    return { ok: false, status: 400, message: 'Token do webhook inválido' };
  }

  return { ok: true, event: asaasBody };
}

module.exports = {
  ASAAS_WEBHOOK_TOKEN_HEADER,
  ASAAS_WEBHOOK_TOKEN_MIN_LENGTH,
  safeEqualAsaas,
  allowsUnverifiedAsaas,
  verifyWebhookAsaas,
};
