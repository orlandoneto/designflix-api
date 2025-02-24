const UserCommissionsServices = require("../services/user-commissions.service");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  app.get(
    "/user-commissions/:userId",
    AuthenticateRoute(["user"]),
    (req, res) => UserCommissionsServices.commissionsUserById(req, res)
  );

  app.post(
    "/user-commissions/create/:userId",
    AuthenticateRoute(["user"]),
    (req, res) => UserCommissionsServices.createCommissionUser(req, res)
  );
};
