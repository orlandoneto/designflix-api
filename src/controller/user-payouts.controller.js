const UserPayoutsServices = require("../services/user-payouts.service");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  app.post(
    "/request-payout",
    AuthenticateRoute(["user"]),
    (req, res) => UserPayoutsServices.requestPayout(req, res)
  );
};
