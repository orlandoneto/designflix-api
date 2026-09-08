/**
 * Endpoints do Asaas usados pelo Designflix.
 *
 * Cada função é um wrapper fino sobre `requestAsaas`. Manter separado do
 * transporte deixa o service mockar endpoint por endpoint no teste.
 *
 * @see https://docs.asaas.com/reference
 */

const { requestAsaas } = require('./asaas-client');

/** Reaproveita cliente por CPF/CNPJ para não duplicar cadastro no Asaas. */
async function findCustomerByCpfCnpjAsaas(cpfCnpj) {
  const asaasResponse = await requestAsaas({
    method: 'GET',
    path: '/customers',
    query: { cpfCnpj, limit: 1 },
  });
  const asaasList = (asaasResponse && asaasResponse.data) || [];
  return asaasList.length ? asaasList[0] : null;
}

async function createCustomerAsaas(asaasCustomerPayload) {
  return requestAsaas({
    method: 'POST',
    path: '/customers',
    body: asaasCustomerPayload,
  });
}

async function createSubscriptionAsaas(asaasSubscriptionPayload) {
  return requestAsaas({
    method: 'POST',
    path: '/subscriptions',
    body: asaasSubscriptionPayload,
  });
}

async function getSubscriptionAsaas(asaasSubscriptionId) {
  return requestAsaas({
    method: 'GET',
    path: `/subscriptions/${asaasSubscriptionId}`,
  });
}

async function cancelSubscriptionAsaas(asaasSubscriptionId) {
  return requestAsaas({
    method: 'DELETE',
    path: `/subscriptions/${asaasSubscriptionId}`,
  });
}

/** Histórico de cobranças — substitui o billing portal da Stripe. */
async function listSubscriptionPaymentsAsaas(asaasSubscriptionId) {
  return requestAsaas({
    method: 'GET',
    path: `/subscriptions/${asaasSubscriptionId}/payments`,
  });
}

/**
 * Tokeniza o cartão. A chave de API não pode ir para o browser, então o número
 * passa por esta API — é o escopo PCI assumido conscientemente.
 * O PAN nunca é persistido: guarda-se só o `creditCardToken` devolvido.
 */
async function tokenizeCreditCardAsaas(asaasTokenizePayload) {
  return requestAsaas({
    method: 'POST',
    path: '/creditCard/tokenize',
    body: asaasTokenizePayload,
  });
}

/** Repasse ao colaborador via Pix (saque). */
async function createTransferAsaas(asaasTransferPayload) {
  return requestAsaas({
    method: 'POST',
    path: '/transfers',
    body: asaasTransferPayload,
  });
}

module.exports = {
  findCustomerByCpfCnpjAsaas,
  createCustomerAsaas,
  createSubscriptionAsaas,
  getSubscriptionAsaas,
  cancelSubscriptionAsaas,
  listSubscriptionPaymentsAsaas,
  tokenizeCreditCardAsaas,
  createTransferAsaas,
};
