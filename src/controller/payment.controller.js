const PaymentStripeService = require("../services/paymentStripe.service");
const AuthenticateRoute = require("../middleware/authentication");

/**
 * Assinatura nova é sempre Asaas (`/asaas/subscriptions`). Aqui sobraram só as
 * rotas do fluxo antigo que ainda têm consumidor — `paymentStripe.service.js`
 * segue completo como módulo isolado, ver docs/architecture/decisions/005.
 *
 * O fluxo Mercado Pago foi removido: nenhum front chamava e não havia
 * assinante nem cobrança Pix registrada.
 */
module.exports = (app) => {
  /* START ENDPOITS STRIP */
  const paymentStripeService = new PaymentStripeService();

  // Estado do plano em `user_plans`. Apesar de morar no serviço da Stripe,
  // é o que alimenta o `useUserData` e o checkout Asaas no site.
  app.get("/user-plan-grouped/:id", AuthenticateRoute(["user"]), (req, res) =>
    paymentStripeService.getUserPlans(req, res)
  );

  // Portal de cobrança: só existe para quem assinou no fluxo antigo da Stripe.
  app.get(
    "/create-customer-portal-session",
    AuthenticateRoute(["user"]),
    (req, res) => paymentStripeService.userPlansPortalSession(req, res)
  );

  // Mantido enquanto houver assinante Stripe ativo.
  app.post("/stripe/webhook", (req, res) =>
    paymentStripeService.handleWebhook(req, res)
  );

  /* END ENDPOITS STRIP */
};
