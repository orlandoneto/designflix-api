const UserFollowsServices = require("../services/user-follows.services");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  app.post("/user/follows", AuthenticateRoute(["user"]), (req, res) =>
    UserFollowsServices.create(req, res)
  );

  app.get(
    "/api/follow/status/:user_id/:contributor_image_user_id/:contributor_image_admin_id",
    AuthenticateRoute(["user"]),
    (req, res) => UserFollowsServices.getIsfollow(req, res)
  );

  app.get(
    "/user/follows/:contributor_image_user_id/total",
    AuthenticateRoute(["user"]),
    (req, res) => UserFollowsServices.getTotalFollowers(req, res)
  );
};
