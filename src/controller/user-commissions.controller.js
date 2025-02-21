const UserCommissionsServices = require("../services/user-commissions.service");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  app.post(
    "/user/:userId/commissions",
    AuthenticateRoute(["user"]),
    (req, res) => UserCommissionsServices.createCommission(req, res)
  );
};
