const UserService = require("../services/user.service");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  app.get(
    "/admin/users",
    AuthenticateRoute(["admin", "super_admin"]),
    (req, res) => UserService.getAll(req, res)
  );

  app.get(
    "/admin/users/contributor",
    AuthenticateRoute(["admin"]),
    (req, res) => UserService.getAllUserContributor(req, res)
  );

  app.get("/user/:id", AuthenticateRoute(["admin", "user"]), (req, res) =>
    UserService.get(req, res)
  );

  app.get("/user/find/:email", (req, res) =>
    UserService.getUserByEmail(req, res)
  );

  app.patch(
    "/user/:userId/update-balance",
    AuthenticateRoute(["user"]),
    (req, res) => UserService.updateBalance(req, res)
  );

  app.post("/user", (req, res) => UserService.create(req, res));

  app.post(
    "/admin/user",
    AuthenticateRoute(["admin", "super_admin"]),
    (req, res) => UserService.createFromAdmin(req, res)
  );

  app.post("/user/authenticate", (req, res) =>
    UserService.authenticate(req, res)
  );

  app.post("/user/reset-password", (req, res) =>
    UserService.resetPassword(req, res)
  );

  app.put("/user", AuthenticateRoute(["user"]), (req, res) =>
    UserService.update(req, res)
  );

  app.put("/user/internal", AuthenticateRoute(["internal_user"]), (req, res) =>
    UserService.updateUserContributor(req, res)
  );
};
