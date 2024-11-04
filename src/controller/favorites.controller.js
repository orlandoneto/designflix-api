const UserFavoritesServices = require("../services/favorites.services");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  app.get("/user/favorites", AuthenticateRoute(["user"]), (req, res) =>
    UserFavoritesServices.getAll(req, res)
  );

  app.post("/user/favorites", AuthenticateRoute(["user"]), (req, res) =>
    UserFavoritesServices.create(req, res)
  );

  app.get(
    "/user/favorites/:user_id/main_grid/:user_main_grid_id",
    AuthenticateRoute(["user"]),
    (req, res) => UserFavoritesServices.getById(req, res)
  );

  app.delete(
    "/user/favorites/:user_id/main_grid/:user_main_grid_id",
    AuthenticateRoute(["user"]),
    (req, res) => UserFavoritesServices.delete(req, res)
  );
};
