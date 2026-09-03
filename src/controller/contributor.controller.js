const ContributorService = require("../services/contributor.service");
const AuthenticateRoute = require("../middleware/authentication");
const { gone } = require("../utils/httpResponse");

module.exports = (app) => {
  app.get("/me", AuthenticateRoute(["user"]), (req, res) =>
    ContributorService.getMe(req, res)
  );

  app.put("/me", AuthenticateRoute(["user"]), (req, res) =>
    ContributorService.updateMe(req, res)
  );

  app.post(
    "/contributor/applications",
    AuthenticateRoute(["user"]),
    (req, res) => ContributorService.apply(req, res)
  );

  app.get(
    "/contributor/application",
    AuthenticateRoute(["user"]),
    (req, res) => ContributorService.getMine(req, res)
  );

  app.get(
    "/admin/contributor/applications",
    AuthenticateRoute(["admin", "super_admin"]),
    (req, res) => ContributorService.listAdmin(req, res)
  );

  app.post(
    "/admin/contributor/applications/:id/approve",
    AuthenticateRoute(["admin", "super_admin"]),
    (req, res) => ContributorService.approve(req, res)
  );

  app.post(
    "/admin/contributor/applications/:id/reject",
    AuthenticateRoute(["admin", "super_admin"]),
    (req, res) => ContributorService.reject(req, res)
  );

  app.get("/admin/users/contributor", (req, res) =>
    gone(
      res,
      "Endpoint removido. Use GET /admin/contributor/applications?status=pending"
    )
  );

  app.put("/user/internal", (req, res) =>
    gone(
      res,
      "Endpoint removido. Use POST /admin/contributor/applications/:id/approve"
    )
  );
};
