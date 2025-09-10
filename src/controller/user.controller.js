const UserService = require("../services/user.service");
const AuthenticateRoute = require("../middleware/authentication");
const verifyRecaptcha = require("../middleware/recaptcha");
const removeAvatarFromS3 = require("../middleware/removeAvatarFromS3");

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

  app.get("/user/balance/:userId",
    AuthenticateRoute(["user"]),
    (req, res) => UserService.userBalanceById(req, res)
  );

  app.get("/user-photos",
    (req, res) => UserService.getAllAvatars(req, res)
  );

  app.patch(
    "/user/:userId/update-balance",
    AuthenticateRoute(["user"]),
    (req, res) => UserService.updateBalance(req, res)
  );

  app.post("/user", (req, res) =>
    UserService.create(req, res)
  );

  app.post(
    "/admin/user",
    AuthenticateRoute(["admin", "super_admin"]),
    (req, res) => UserService.createFromAdmin(req, res)
  );

  app.post("/user/authenticate", verifyRecaptcha('login'), (req, res) =>
    UserService.authenticate(req, res)
  );

  app.post("/user/reset-password", (req, res) =>
    UserService.resetPassword(req, res)
  );

  app.put("/user/:userId", AuthenticateRoute(["user"]), (req, res) =>
    UserService.updateUserProfile(req, res)
  );

  app.put("/user/internal", AuthenticateRoute(["internal_user"]), (req, res) =>
    UserService.updateUserContributorInternal(req, res)
  );

  app.delete(
    "/user/:userId/photo",
    AuthenticateRoute(["user"]),
    removeAvatarFromS3,
    (req, res) => UserService.removeUserPhoto(req, res)
  );
};
