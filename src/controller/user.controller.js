const UserService = require("../services/user.service");
const ContributorService = require("../services/contributor.service");
const AuthenticateRoute = require("../middleware/authentication");
const removeAvatar = require("../middleware/removeAvatar");

module.exports = (app) => {
  app.get("/admin/users",
    AuthenticateRoute(["admin", "super_admin"]),
    (req, res) => UserService.getAll(req, res)
  );

  app.get("/user/balance/:userId",
    AuthenticateRoute(["user"]),
    (req, res) => UserService.userBalanceById(req, res)
  );

  app.get("/user-photos",
    (req, res) => UserService.getAllAvatars(req, res)
  );

  app.get("/user/:id", AuthenticateRoute(["admin", "user"]), (req, res) =>
    UserService.get(req, res)
  );

  app.patch(
    "/user/:userId/update-balance",
    AuthenticateRoute(["user"]),
    (req, res) => UserService.updateBalance(req, res)
  );

  app.post(
    "/admin/user",
    AuthenticateRoute(["admin", "super_admin"]),
    (req, res) => UserService.createFromAdmin(req, res)
  );

  app.put(
    "/user/:userId/update-password",
    AuthenticateRoute(["user"]),
    (req, res) => UserService.updatePasswordById(req, res)
  );

  app.put("/user/:userId", AuthenticateRoute(["user"]), (req, res) =>
    ContributorService.updateMe(req, res)
  );

  app.delete(
    "/user/:userId/photo",
    AuthenticateRoute(["user"]),
    removeAvatar,
    (req, res) => UserService.removeUserPhoto(req, res)
  );

  app.delete(
    "/user/:userId",
    AuthenticateRoute(["user"]),
    (req, res) => UserService.deleteUser(req, res)
  );  
};
