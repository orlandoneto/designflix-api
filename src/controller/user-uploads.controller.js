const UserUploadsServices = require("../services/user-uploads.services");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  app.patch(
    "/user/uploads/:user_id/increment",
    AuthenticateRoute(["user"]),
    (req, res) => UserUploadsServices.incrementUploads(req, res)
  );

  app.get("/user/uploads", AuthenticateRoute(["admin"]), (req, res) =>
    UserUploadsServices.getAllUploads(req, res)
  );

  app.get("/user/uploads/:user_id", AuthenticateRoute(["user"]), (req, res) =>
    UserUploadsServices.getUploadsByUserId(req, res)
  );
};
