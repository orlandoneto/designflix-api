const UserMainGrid = require("../services/user-main-grid.service");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  const UserMainGridService = new UserMainGrid();

  app.post(
    "/user-main-grid",
    AuthenticateRoute(["admin", "user"]),
    (req, res) => UserMainGridService.create(req, res)
  );
  app.get("/user-main-grid/flter", (req, res) =>
    UserMainGridService.getAll(req, res)
  );
  app.get("/user-main-grid/categories/filter", (req, res) =>
    UserMainGridService.getAllByCategory(req, res)
  );
  app.get("/user-main-grid/user/:id", AuthenticateRoute(["user"]), (req, res) =>
    UserMainGridService.getAllByUserId(req, res)
  );
  app.get(
    "/user-main-grid/:id",
    AuthenticateRoute(["admin", "user"]),
    (req, res) => UserMainGridService.getOne(req, res)
  );
  app.get("/user-main-grid/:user_id/count", (req, res) =>
    UserMainGridService.countByUserId(req, res)
  );
  app.put(
    "/user-main-grid/:id",
    AuthenticateRoute(["admin", "user"]),
    (req, res) => UserMainGridService.updateById(req, res)
  );
  app.delete(
    "/user-main-grid/:id",
    AuthenticateRoute(["admin", "user"]),
    (req, res) => UserMainGridService.deleteById(req, res)
  );
};
