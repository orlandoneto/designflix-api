/**
 * Confere a configuração do Asaas sem criar nada na conta.
 *
 * Uso: `node scripts/asaas-smoke.js`
 *
 * Só faz GET: valida a chave, mostra de qual conta ela é e quanto há de saldo
 * (o saque do colaborador sai desse saldo, não do cartão do assinante).
 */

require('dotenv').config({ path: __dirname + '/../.env' });

const {
  isConfiguredAsaas,
  resolveEnvironmentAsaas,
  resolveBaseUrlAsaas,
} = require('../src/services/payments/gateways/asaas/asaas-config');
const {
  requestAsaas,
} = require('../src/services/payments/gateways/asaas/asaas-client');

(async () => {
  console.log('ambiente:', resolveEnvironmentAsaas());
  console.log('base url:', resolveBaseUrlAsaas());
  console.log('chave configurada:', isConfiguredAsaas());

  // GET puro: valida a credencial sem criar nada na conta.
  const account = await requestAsaas({ method: 'GET', path: '/myAccount' });
  console.log('conta:', {
    name: account && account.name,
    email: account && account.email,
    accountNumber: account && account.accountNumber,
  });

  const balance = await requestAsaas({
    method: 'GET',
    path: '/finance/balance',
  });
  console.log('saldo (para saque):', balance);

  const customers = await requestAsaas({
    method: 'GET',
    path: '/customers',
    query: { limit: 1 },
  });
  console.log('clientes cadastrados:', customers && customers.totalCount);
})().catch((error) => {
  console.error('FALHOU:', error.message, error.details || '');
  process.exit(1);
});
