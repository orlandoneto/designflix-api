/**
 * Rotas do módulo Asaas.
 *
 * O webhook não usa `AuthenticateRoute`: quem autentica é o token do header
 * `asaas-access-token`, conferido dentro do service. Diferente da Stripe, não
 * precisa de raw body — a validação não é assinatura do corpo.
 *
 * @see docs/contextos/plans.md
 */

const AsaasSubscriptionService = require('../services/payments/gateways/asaas/asaas-subscription.service');
const AsaasWebhookService = require('../services/payments/gateways/asaas/asaas-webhook.service');
const AuthenticateRoute = require('../middleware/authentication');

module.exports = (app) => {
  app.post('/asaas/webhook', (req, res) =>
    AsaasWebhookService.handleWebhook(req, res)
  );

  app.post(
    '/asaas/credit-card/token',
    AuthenticateRoute(['user']),
    (req, res) => AsaasSubscriptionService.tokenizeCreditCard(req, res)
  );

  app.post('/asaas/subscriptions', AuthenticateRoute(['user']), (req, res) =>
    AsaasSubscriptionService.createSubscription(req, res)
  );

  app.put(
    '/asaas/subscriptions/me/plan',
    AuthenticateRoute(['user']),
    (req, res) => AsaasSubscriptionService.changePlan(req, res)
  );

  app.get(
    '/asaas/subscriptions/me',
    AuthenticateRoute(['user']),
    (req, res) => AsaasSubscriptionService.getMySubscription(req, res)
  );

  app.get(
    '/asaas/subscriptions/me/payments',
    AuthenticateRoute(['user']),
    (req, res) => AsaasSubscriptionService.listMyPayments(req, res)
  );

  app.delete(
    '/asaas/subscriptions/me',
    AuthenticateRoute(['user']),
    (req, res) => AsaasSubscriptionService.cancelSubscription(req, res)
  );
};
