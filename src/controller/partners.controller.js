const PartnersService = require("../services/partners.service");

module.exports = (app) => {
  const partnersService = new PartnersService();

  // Pública de propósito: valida o código antes de criar a conta.
  app.get(
    "/partners/verify-code/:code",
    (req, res) => partnersService.verifyPartnerCode(req, res)
  );
};
