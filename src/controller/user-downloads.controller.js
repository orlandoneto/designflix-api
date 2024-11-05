const UserDownloadsServices = require("../services/user-downloads.services");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  app.get("/user/downloads", AuthenticateRoute(["user"]), (req, res) =>
    UserDownloadsServices.getAll(req, res)
  );

  app.post("/user/downloads", AuthenticateRoute(["user"]), (req, res) =>
    UserDownloadsServices.create(req, res)
  );

  app.get(
    "/user/downloads/:user_id/main_grid/:user_main_grid_id",
    AuthenticateRoute(["user"]),
    (req, res) => UserDownloadsServices.getById(req, res)
  );

  app.delete(
    "/user/downloads/:user_id/main_grid/:user_main_grid_id",
    AuthenticateRoute(["user"]),
    (req, res) => UserDownloadsServices.delete(req, res)
  );
};
