const TagsService = require("../services/tags.service");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  app.get("/tags", AuthenticateRoute(["admin", "user"]), (req, res) =>
    TagsService.getAll(req, res)
  );
  app.post("/tags", AuthenticateRoute(["admin"]), (req, res) =>
    TagsService.create(req, res)
  );
  app.delete("/tags/:id", AuthenticateRoute(["admin"]), (req, res) =>
    TagsService.delete(req, res)
  );
};
