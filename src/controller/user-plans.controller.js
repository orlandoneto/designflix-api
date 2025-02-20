const UserPlansServices = require("../services/user-plans.services");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  app.get(
    "/user/plans/:userId/check",
    AuthenticateRoute(["user"]),
    (req, res) => UserPlansServices.planIsOutOfTime(req, res)
  );

  app.get(
    "/user/plans/:userId/active",
    AuthenticateRoute(["user"]),
    (req, res) => UserPlansServices.getActivePlan(req, res)
  );
};