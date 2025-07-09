const Forgot = require("../services/forgot.service");
const verifyRecaptcha = require("../middleware/recaptcha");

module.exports = (app) => {
  const ForgotService = new Forgot();

  app.post("/forgot-password", (req, res) =>
    ForgotService.forgotPassword(req, res)
  );
  app.get("/forgot-check-token/:token", (req, res) =>
    ForgotService.forgotCheckToken(req, res)
  );
  app.put("/forgot-update-password/:token", (req, res) =>
    ForgotService.forgotUpdatePassword(req, res)
  );
};
