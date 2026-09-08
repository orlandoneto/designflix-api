/**
 * Transporte HTTP do módulo Asaas. Só sabe falar com a API — não conhece rotas
 * de negócio (isso é `asaas-api.js`) nem banco.
 *
 * Não há retry automático de propósito: são operações que movem dinheiro, e
 * repetir cegamente um POST cria cobrança duplicada.
 */

const axios = require('axios');
const {
  resolveBaseUrlAsaas,
  resolveApiKeyAsaas,
  isConfiguredAsaas,
} = require('./asaas-config');

const ASAAS_REQUEST_TIMEOUT_MS = 15000;

let asaasInsecureAgent = null;

/**
 * Agente que ignora a cadeia de certificados — só para dev com antivírus ou
 * proxy fazendo SSL inspection, que quebra a validação com
 * "unable to verify the first certificate" (mesmo caso de
 * `STORAGE_TLS_INSECURE` e `EMAIL_TLS_INSECURE`).
 *
 * Em produção é ignorado por princípio: aqui passa dinheiro, e sem validar o
 * certificado não há como saber que o outro lado é o Asaas.
 *
 * @returns {import('https').Agent|undefined}
 */
function resolveHttpsAgentAsaas() {
  const insecure =
    String(process.env.ASAAS_TLS_INSECURE || '')
      .trim()
      .toLowerCase() === 'true';
  if (!insecure || process.env.NODE_ENV === 'production') return undefined;

  // Um agente só: criar por request vaza socket.
  if (!asaasInsecureAgent) {
    const https = require('https');
    asaasInsecureAgent = new https.Agent({ rejectUnauthorized: false });
  }
  return asaasInsecureAgent;
}

class AsaasError extends Error {
  constructor(message, { status = null, errors = [] } = {}) {
    super(message);
    this.name = 'AsaasError';
    this.status = status;
    this.errors = errors;
  }
}

/** O Asaas devolve `{ errors: [{ code, description }] }`. */
function extractErrorMessageAsaas(responseData, fallback) {
  const asaasErrors = responseData && responseData.errors;
  if (Array.isArray(asaasErrors) && asaasErrors.length) {
    const description = asaasErrors
      .map((item) => item && item.description)
      .filter(Boolean)
      .join('; ');
    if (description) return description;
  }
  return fallback;
}

/**
 * @param {{ method: string, path: string, body?: object, query?: object }} options
 * @returns {Promise<object>} corpo da resposta
 * @throws {AsaasError}
 */
async function requestAsaas({ method, path, body, query }) {
  if (!isConfiguredAsaas()) {
    throw new AsaasError('Integração com o Asaas não configurada', {
      status: 500,
    });
  }

  const asaasUrl = `${resolveBaseUrlAsaas()}${path}`;

  try {
    const response = await axios({
      method,
      url: asaasUrl,
      params: query,
      data: body,
      timeout: ASAAS_REQUEST_TIMEOUT_MS,
      httpsAgent: resolveHttpsAgentAsaas(),
      headers: {
        access_token: resolveApiKeyAsaas(),
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    const status = error.response ? error.response.status : null;
    const message = extractErrorMessageAsaas(
      error.response && error.response.data,
      'Falha na comunicação com o Asaas'
    );
    throw new AsaasError(message, {
      status,
      errors: (error.response && error.response.data && error.response.data.errors) || [],
    });
  }
}

module.exports = {
  ASAAS_REQUEST_TIMEOUT_MS,
  AsaasError,
  extractErrorMessageAsaas,
  resolveHttpsAgentAsaas,
  requestAsaas,
};
