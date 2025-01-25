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

  /* END ENDPOITS STRIP */

  /* START ENDPOITS MERCADOPAGO */
  app.post("/create-mercadopago-pix", AuthenticateRoute(["user"]), (req, res) =>
    paymentMercadopagoService.createPix(req, res)
  );

  app.post("/v1/webhook", (req, res) =>
    paymentMercadopagoService.processPaymentWebhook(req, res)
  );

  app.get("/mercadopago/pix/:id", AuthenticateRoute(["user"]), (req, res) =>
    paymentMercadopagoService.getById(req, res)
  );

  app.put("/mercadopago/pix/:id", AuthenticateRoute(["user"]), (req, res) =>
    paymentMercadopagoService.updateById(req, res)
  );

  /* END ENDPOITS MERCADOPAGO */
};
