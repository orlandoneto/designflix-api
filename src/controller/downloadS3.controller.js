const DownloadS3 = require("../services/downloadS3.service");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  app.get("/signed/url", AuthenticateRoute(["user"]), (req, res) =>
    DownloadS3.getSignedUrlS3(req, res)
  );
};
