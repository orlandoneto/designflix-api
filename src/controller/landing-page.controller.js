const LandingPageService = require("../services/landing-page.service");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  const service = new LandingPageService();

  app.post("/landingpage", AuthenticateRoute(["admin", "user"]), (req, res) => service.createOrUpdate(req, res));
  app.get("/landingpage/:username", (req, res) => service.getByUsername(req, res));
};


