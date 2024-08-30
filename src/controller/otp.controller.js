const OTP = require("../services/otp.service");

module.exports = (app) => {
  const OTPService = new OTP();

  app.get("/otp/send", (req, res) => OTPService.sendOTP(req, res));
  app.get("/otp/verify", (req, res) => OTPService.verifyOTP(req, res));
};
