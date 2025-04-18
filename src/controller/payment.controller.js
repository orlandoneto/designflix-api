const PaymentStripeService = require("../services/paymentStripe.service");
const PaymentMercadopagoService = require("../services/paymentMercadopago.service");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  /* START ENDPOITS STRIP */
  const paymentStripeService = new PaymentStripeService();
  const paymentMercadopagoService = new PaymentMercadopagoService();

  app.post("/create-subscription", AuthenticateRoute(["user"]), (req, res) =>
    paymentStripeService.createSubscription(req, res)
  );

  app.put(
    "/update-subscription",
    AuthenticateRoute(["user"]),
    (req, res) => paymentStripeService.updateSubscription(req, res)
  );

  app.get(
    "/retrieve-plan-stripe/:planId",
    AuthenticateRoute(["user"]),
    (req, res) => paymentStripeService.retrievePlans(req, res)
  );

  app.get("/user-plan-grouped/:id", AuthenticateRoute(["user"]), (req, res) =>
    paymentStripeService.getUserPlans(req, res)
  );

  app.get("/user-plan", AuthenticateRoute(["user"]), (req, res) =>
    paymentStripeService.userPlan(req, res)
  );

  app.get("/user-plan-all", (req, res) =>
    paymentStripeService.getAllPlans(req, res)
  );

  app.get(
    "/create-customer-portal-session",
    AuthenticateRoute(["user"]),
    (req, res) => paymentStripeService.userPlansPortalSession(req, res)
  );

  app.post("/stripe/webhook", (req, res) =>
    paymentStripeService.handleWebhook(req, res)
  );

  app.get(
    "/user-plan-download/:userId",
    AuthenticateRoute(["user"]),
    (req, res) => paymentStripeService.getUserPlanDownloads(req, res)
  );

  app.delete(
    "/stripe/trial/:customerId/cancel",
    AuthenticateRoute(["user"]),
    (req, res) => paymentStripeService.refundSubscriptionWithin7Days(req, res)
  );

  /* END ENDPOITS STRIP */

  /* START ENDPOITS MERCADOPAGO */
  app.post("/create-mercadopago-pix", AuthenticateRoute(["user"]), (req, res) =>
    paymentMercadopagoService.createMercadopagoPix(req, res)
  );

  app.post("/mercadopago/pix/webhook", (req, res) =>
    paymentMercadopagoService.mercadopagoPixPaymentWebhook(req, res)
  );

  app.put("/mercadopago/pix/:id", AuthenticateRoute(["user"]), (req, res) =>
    paymentMercadopagoService.updateById(req, res)
  );

  app.delete(
    "/mercadopago/trial/:userId/cancel",
    AuthenticateRoute(["user"]),
    (req, res) => paymentMercadopagoService.cancelTrialMercadopago(req, res)
  );

  /* END ENDPOITS MERCADOPAGO */
};
