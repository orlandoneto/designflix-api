const UserUploadsServices = require("../services/user-uploads.services");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  app.patch(
    "/user/uploads/:user_id/increment",
    AuthenticateRoute(["user"]),
    (req, res) => UserUploadsServices.incrementUploads(req, res)
  );
};
