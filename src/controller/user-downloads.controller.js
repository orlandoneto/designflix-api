const UserDownloadsServices = require("../services/user-downloads.services");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  app.get("/user/downloads/:user_id", AuthenticateRoute(["user"]), (req, res) =>
    UserDownloadsServices.getUserDownloads(req, res)
  );

  app.get(
    "/user/downloads/contributor/:contributor_image_user_id/total",
    AuthenticateRoute(["user"]),
    (req, res) => UserDownloadsServices.getContributorDownloads(req, res)
  );

  app.get(
    "/user/downloads/image/:user_main_grid_id/total",
    AuthenticateRoute(["user"]),
    (req, res) => UserDownloadsServices.getTotalDownloadsByImage(req, res)
  );

  app.post("/user/downloads/increment", AuthenticateRoute(["user"]), (req, res) =>
    UserDownloadsServices.createOrUpdateDownload(req, res)
  );
};
