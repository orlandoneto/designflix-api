const PaymentService = require("../services/payment.service");
const VerifyWebhook = require("../middleware/verifyWebhook");

module.exports = (app) => {
  const paymentService = new PaymentService();

  app.post("/create-subscription", (req, res) =>
    paymentService.createSubscription(req, res)
  );

  app.post("/webhook", VerifyWebhook, (req, res) =>
    paymentService.handleWebhook(req, res)
  );
};
