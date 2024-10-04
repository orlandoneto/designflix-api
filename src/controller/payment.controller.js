const PaymentService = require("../services/payment.service");
const VerifyWebhook = require("../middleware/verifyWebhook");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  const paymentService = new PaymentService();

  app.post("/create-subscription", AuthenticateRoute(["user"]), (req, res) =>
    paymentService.createSubscription(req, res)
  );

  app.get("/retrieve-plan/:planId", AuthenticateRoute(["user"]), (req, res) =>
    paymentService.retrievePlans(req, res)
  );

  app.post("/webhook", VerifyWebhook, (req, res) =>
    paymentService.handleWebhook(req, res)
  );
};
