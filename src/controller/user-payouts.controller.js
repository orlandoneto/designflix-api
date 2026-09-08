/**
 * Rotas de saque do colaborador (Pix via Asaas).
 *
 * O `:userId` da URL é decorativo: `AuthenticateRoute(['user'])` sobrescreve
 * `req.params.userId` com o id do token, e é esse que o service usa. Nenhuma
 * rota aqui aceita `userId` no corpo.
 *
 * @see docs/contextos/colaborador-ganhos.md
 */

const UserPayoutsServices = require("../services/user-payouts.service");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  app.post("/request-payout", AuthenticateRoute(["user"]), (req, res) =>
    UserPayoutsServices.requestPayout(req, res)
  );

  app.post(
    "/user/:userId/update-payout-method",
    AuthenticateRoute(["user"]),
    (req, res) => UserPayoutsServices.choosePayoutMethod(req, res)
  );
};
