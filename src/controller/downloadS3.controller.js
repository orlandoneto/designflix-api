const { isLocalUploadMode } = require("../utils/isLocalUploadMode");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  const Download = isLocalUploadMode()
    ? require("../services/downloadS3.local.service")
    : require("../services/downloadS3.service");

  app.get("/signed/url", AuthenticateRoute(["user"]), (req, res) =>
    Download.getSignedUrlS3(req, res)
  );
};
