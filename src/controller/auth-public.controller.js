const AuthPublicService = require("../services/auth-public.service");
const verifyRecaptcha = require("../middleware/recaptcha");

module.exports = (app) => {
  const auth = new AuthPublicService();

  app.post("/user/authenticate", verifyRecaptcha("login"), (req, res) =>
    auth.authenticate(req, res)
  );

  app.get("/user/find/:email", (req, res) => auth.getUserByEmail(req, res));

  app.post("/user", (req, res) => auth.register(req, res));

  app.get("/otps/send", (req, res) => auth.sendOtp(req, res));

  app.get("/otps/verify", (req, res) => auth.verifyOtp(req, res));

  app.post("/forgot-password", (req, res) => auth.forgotPassword(req, res));

  app.get("/forgot-check-token/:token", (req, res) =>
    auth.forgotCheckToken(req, res)
  );

  app.put("/forgot-update-password/:token", (req, res) =>
    auth.forgotUpdatePassword(req, res)
  );
};
