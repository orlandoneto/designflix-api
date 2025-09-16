const PartnersService = require("../services/partners.service");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  const partnersService = new PartnersService();

  // Rotas para gerenciar parceiros
  app.post(
    "/partners",
    AuthenticateRoute(["user"]),
    (req, res) => partnersService.create(req, res)
  );

  app.get(
    "/partners",
    AuthenticateRoute(["user"]),
    (req, res) => partnersService.getAll(req, res)
  );

  app.get(
    "/partners/:id",
    AuthenticateRoute(["user"]),
    (req, res) => partnersService.getOne(req, res)
  );

  app.get(
    "/partners/verify-code/:code",
    AuthenticateRoute(["user"]),
    (req, res) => partnersService.verifyPartnerCode(req, res)
  );

  app.put(
    "/partners/:id",
    AuthenticateRoute(["user"]),
    (req, res) => partnersService.updateById(req, res)
  );

  app.delete(
    "/partners/:id",
    AuthenticateRoute(["user"]),
    (req, res) => partnersService.deleteById(req, res)
  );

  // Rotas para gerenciar parcerias de usuários
  app.post(
    "/user-partnerships",
    AuthenticateRoute(["user"]),
    (req, res) => partnersService.createUserPartnership(req, res)
  );

  app.get(
    "/user-partnerships/:userId",
    AuthenticateRoute(["user"]),
    (req, res) => partnersService.getUserPartnerships(req, res)
  );

  app.put(
    "/user-partnerships/:id",
    AuthenticateRoute(["user"]),
    (req, res) => partnersService.updateUserPartnership(req, res)
  );

  app.delete(
    "/user-partnerships/:id",
    AuthenticateRoute(["user"]),
    (req, res) => partnersService.endUserPartnership(req, res)
  );
};
