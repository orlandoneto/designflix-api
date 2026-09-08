const PlansDownloadLimitsServices = require("../services/plans-download-limit.service");
const AuthenticateRoute = require("../middleware/authentication");

/**
 * Quota diária de download (leitura). O CRUD manual saiu: o consumo real
 * acontece no `GET /signed/url` — ver docs/contextos/download-daily-limit.md.
 */
module.exports = (app) => {
  const plansDownloadLimitsServices = new PlansDownloadLimitsServices();

  app.get(
    "/user/plans/download-limits/me",
    AuthenticateRoute(["user"]),
    (req, res) => plansDownloadLimitsServices.getMyQuota(req, res)
  );
};
