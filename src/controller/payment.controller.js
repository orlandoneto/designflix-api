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

  app.get(
    "/user-plan-grouped/:userId",
    AuthenticateRoute(["user"]),
    (req, res) => paymentService.getUserPlans(req, res)
  );

  app.get("/user-plan", AuthenticateRoute(["user"]), (req, res) =>
    paymentService.userPlan(req, res)
  );

  app.get(
    "/create-customer-portal-session",
    AuthenticateRoute(["user"]),
    (req, res) => paymentService.userPlansPortalSession(req, res)
  );

  app.post("/webhook", VerifyWebhook, (req, res) =>
    paymentService.handleWebhook(req, res)
  );

  app.get(
    "/user-plan-download/:userId",
    AuthenticateRoute(["user"]),
    (req, res) => paymentService.getUserPlanDownloads(req, res)
  );

  app.put(
    "/user-plan-download-update/:userId",
    AuthenticateRoute(["user"]),
    (req, res) => paymentService.updateUserPlanDownloads(req, res)
  );
};
