/**
 * Configuração do módulo Asaas.
 *
 * Convenção de nomenclatura do módulo (vale para todos os arquivos daqui):
 *   - constantes: prefixo `ASAAS_`
 *   - funções:    sufixo `Asaas`
 *   - variáveis:  prefixo `asaas`
 *
 * Tudo lê `process.env` na chamada, não no import, para o teste conseguir
 * trocar o ambiente sem recarregar o módulo.
 */

const ASAAS_ENVIRONMENTS = {
  SANDBOX: 'sandbox',
  PRODUCTION: 'production',
};

const ASAAS_BASE_URLS = {
  [ASAAS_ENVIRONMENTS.SANDBOX]: 'https://api-sandbox.asaas.com/v3',
  [ASAAS_ENVIRONMENTS.PRODUCTION]: 'https://api.asaas.com/v3',
};

/** Sandbox é o default: errar para o lado que não move dinheiro real. */
function resolveEnvironmentAsaas() {
  const raw = String(process.env.ASAAS_ENV || '')
    .trim()
    .toLowerCase();
  return raw === ASAAS_ENVIRONMENTS.PRODUCTION
    ? ASAAS_ENVIRONMENTS.PRODUCTION
    : ASAAS_ENVIRONMENTS.SANDBOX;
}

function resolveBaseUrlAsaas() {
  const override = String(process.env.ASAAS_BASE_URL || '').trim();
  if (override) return override.replace(/\/+$/, '');
  return ASAAS_BASE_URLS[resolveEnvironmentAsaas()];
}

function resolveApiKeyAsaas() {
  return String(process.env.ASAAS_API_KEY || '').trim();
}

function resolveWebhookTokenAsaas() {
  return String(process.env.ASAAS_WEBHOOK_TOKEN || '').trim();
}

/** Sem chave o módulo fica inerte em vez de estourar no boot. */
function isConfiguredAsaas() {
  return Boolean(resolveApiKeyAsaas());
}

module.exports = {
  ASAAS_ENVIRONMENTS,
  ASAAS_BASE_URLS,
  resolveEnvironmentAsaas,
  resolveBaseUrlAsaas,
  resolveApiKeyAsaas,
  resolveWebhookTokenAsaas,
  isConfiguredAsaas,
};
