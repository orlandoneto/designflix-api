const UserFollowsServices = require("../services/user-follows.services");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  app.get("/user/uploads", AuthenticateRoute(["user"]), (req, res) =>
    UserFollowsServices.getAll(req, res)
  );

  app.post("/user/uploads", AuthenticateRoute(["user"]), (req, res) =>
    UserFollowsServices.create(req, res)
  );

  app.get(
    "/user/uploads/:user_id/main_grid/:user_main_grid_id",
    AuthenticateRoute(["user"]),
    (req, res) => UserFollowsServices.getById(req, res)
  );

  app.delete(
    "/user/uploads/:user_id/main_grid/:user_main_grid_id",
    AuthenticateRoute(["user"]),
    (req, res) => UserFollowsServices.delete(req, res)
  );
};
