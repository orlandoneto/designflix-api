const ComplaintsServices = require("../services/complaints.services");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  app.get("/complaints", AuthenticateRoute(["user"]), (req, res) =>
    ComplaintsServices.getAll(req, res)
  );
  app.post("/complaints", AuthenticateRoute(["user"]), (req, res) =>
    ComplaintsServices.create(req, res)
  );
  app.delete("/complaints/:id", AuthenticateRoute(["user"]), (req, res) =>
    ComplaintsServices.delete(req, res)
  );
};
