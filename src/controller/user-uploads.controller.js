const UserUploadsServices = require("../services/user-uploads.services");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  app.get("/user/uploads", AuthenticateRoute(["user"]), (req, res) =>
    UserUploadsServices.getAll(req, res)
  );

  app.post("/user/uploads", AuthenticateRoute(["user"]), (req, res) =>
    UserUploadsServices.create(req, res)
  );

  app.get(
    "/user/uploads/:user_id/main_grid/:user_main_grid_id",
    AuthenticateRoute(["user"]),
    (req, res) => UserUploadsServices.getById(req, res)
  );

  app.delete(
    "/user/uploads/:user_id/main_grid/:user_main_grid_id",
    AuthenticateRoute(["user"]),
    (req, res) => UserUploadsServices.delete(req, res)
  );
};
