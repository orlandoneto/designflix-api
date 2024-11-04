const UserBugController = require("../services/user-bug-reports.services");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  app.get("/user/bug", AuthenticateRoute(["user"]), (req, res) =>
    UserBugController.getAll(req, res)
  );
  app.post("/user/bug", AuthenticateRoute(["user"]), (req, res) =>
    UserBugController.create(req, res)
  );
  app.delete("/user/bug/:id", AuthenticateRoute(["user"]), (req, res) =>
    UserBugController.delete(req, res)
  );
};
