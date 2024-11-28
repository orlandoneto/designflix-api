const PlansDownloadLimitsServices = require("../services/plans-download-limit.service");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  const plansDownloadLimitsServices = new PlansDownloadLimitsServices();

  app.post(
    "/user/plans/download-limits",
    AuthenticateRoute(["user"]),
    (req, res) => plansDownloadLimitsServices.create(req, res)
  );

  app.get(
    "/user/plans/download-limits/:user_id",
    AuthenticateRoute(["user"]),
    (req, res) => plansDownloadLimitsServices.findByUserId(req, res)
  );

  app.put(
    "/user/plans/download-limits/:user_id",
    AuthenticateRoute(["user"]),
    (req, res) => plansDownloadLimitsServices.update(req, res)
  );

  app.delete(
    "/user/plans/download-limits/:user_id",
    AuthenticateRoute(["user"]),
    (req, res) => plansDownloadLimitsServices.delete(req, res)
  );

  app.get(
    "/user/plans/download-limits",
    AuthenticateRoute(["user"]),
    (req, res) => plansDownloadLimitsServices.getAll(req, res)
  );
};
