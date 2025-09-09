const LandingPageService = require("../services/landing-page.service");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  const service = new LandingPageService();

  app.post("/landingpage", AuthenticateRoute(["user"]), (req, res) => service.createOrUpdate(req, res));
  app.get("/landingpage/:username", (req, res) => service.getByUsername(req, res));
  app.get("/landingpage/by-user/:userId", (req, res) => service.getByUserId(req, res));
};