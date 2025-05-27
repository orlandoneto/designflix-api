const OTPS = require("../services/otps.service");
const verifyRecaptcha = require("../middleware/recaptcha");

module.exports = (app) => {
  const OTPService = new OTPS();

  app.get("/otps/send", (req, res) => OTPService.sendOTP(req, res));

  app.get("/otps/verify", verifyRecaptcha('verify-code'), (req, res) =>
    OTPService.verifyOTP(req, res)
  );
};
