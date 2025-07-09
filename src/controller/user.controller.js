const UserService = require("../services/user.service");
const AuthenticateRoute = require("../middleware/authentication");
const verifyRecaptcha = require("../middleware/recaptcha");

module.exports = (app) => {
  app.get(
    "/admin/users",
    AuthenticateRoute(["admin", "super_admin"]),
    (req, res) => UserService.getAll(req, res)
  );

  app.get(
    "/admin/users/contributor",
    AuthenticateRoute(["admin"]),
    (req, res) => UserService.getAllUserContributor(req, res)
  );

  app.get("/user/:id", AuthenticateRoute(["admin", "user"]), (req, res) =>
    UserService.get(req, res)
  );

  app.get("/user/find/:email", (req, res) =>
    UserService.getUserByEmail(req, res)
  );

  app.get(
    "/user/balance/:userId",
    AuthenticateRoute(["user"]),
    (req, res) => UserService.userBalanceById(req, res)
  );

  app.patch(
    "/user/:userId/update-balance",
    AuthenticateRoute(["user"]),
    (req, res) => UserService.updateBalance(req, res)
  );

  app.post("/user", (req, res) =>
    UserService.create(req, res)
  );

  app.post(
    "/admin/user",
    AuthenticateRoute(["admin", "super_admin"]),
    (req, res) => UserService.createFromAdmin(req, res)
  );

  /**
   * @openapi
   * /user/authenticate:
   *  post:
   *    description: Endpoint de autenticação do usuário! Retorna o Token para ser usado em outras requests.
   *    security: []
   *    tags: ["Auth"]
   *    requestBody:
   *      required: true
   *      content:
   *        application/json:
   *          schema:
   *            type: object
   *            properties:
   *              email:
   *                type: string
   *              password:
   *                type: string
   *              recaptchaToken:
   *                type: string
   *                description: Token do reCAPTCHA v2
   *    responses:
   *      '200':
   *        description: Login efetuado com sucesso.
   *      '400':
   *        description: Dados inválidos ou falha na verificação do reCAPTCHA.
   *      '401':
   *        description: Não autorizado.
   *      '500':
   *        description: Erro interno do servidor.
   */
  app.post("/user/authenticate", verifyRecaptcha('login'), (req, res) =>
    UserService.authenticate(req, res)
  );

  app.post("/user/reset-password", (req, res) =>
    UserService.resetPassword(req, res)
  );

  app.put("/user/:userId/:userType", AuthenticateRoute(["user"]), (req, res) =>
    UserService.updateUser(req, res)
  );

  app.put("/user/internal", AuthenticateRoute(["internal_user"]), (req, res) =>
    UserService.updateUserContributorInternal(req, res)
  );
};
