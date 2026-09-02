const UserMainGrid = require("../services/user-main-grid.service");
const AuthenticateRoute = require("../middleware/authentication");
const { gone } = require("../utils/httpResponse");

/**
 * Rotas de grid do colaborador / admin.
 * Catálogo público → `/catalog/*` (ver docs/contextos/home-publico.md).
 */
module.exports = (app) => {
  const UserMainGridService = new UserMainGrid();

  const legacyGone = (req, res) =>
    gone(
      res,
      "Endpoint removido. Use GET /catalog/search, /catalog/facets ou /catalog/:id"
    );

  app.get("/user-main-grid/flter", legacyGone);
  app.get("/user-main-grid/detail/:id", legacyGone);
  app.get("/user-main-grid/categories/filter", legacyGone);

  app.post(
    "/user-main-grid",
    AuthenticateRoute(["admin", "user"]),
    (req, res) => UserMainGridService.create(req, res)
  );
  app.get("/user-main-grid/formats", (req, res) =>
    UserMainGridService.getFormats(req, res)
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
