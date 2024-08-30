const Tema = require("../services/tema.service");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  const TemaService = new Tema();

  app.post("/tema", AuthenticateRoute(['admin', 'super_admin']), (req, res) =>
   TemaService.create(req, res)
  );
  app.get("/tema", AuthenticateRoute(['admin', 'super_admin']), (req, res) =>
   TemaService.getAll(req, res)
  );
  app.get("/tema/:id", AuthenticateRoute(['admin', 'super_admin']), (req, res) =>
   TemaService.getOne(req, res)
  );
  app.put("/tema/:id", AuthenticateRoute(['admin', 'super_admin']), (req, res) =>
   TemaService.updateById(req, res)
  );
  app.delete("/tema/:id", AuthenticateRoute(['admin', 'super_admin']), (req, res) =>
   TemaService.deleteById(req, res)
  );
};
