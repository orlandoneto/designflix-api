const User = require("../services/user.service");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  const UserService = new User();

  /**
   * @openapi
   * /admin/users:
   *  get:
   *    description: Este endpoint serve para listar os clientes dentro da área de admin. Só pode ser chamado com token de admin válido.
   *    tags: ["Admin"]
   *    responses:
   *      '200':
   *        description: Sucesso.
   *      '401':
   *        description: Não autorizado, token inválido ou expirado.
   */
  app.get(
    "/admin/users",
    AuthenticateRoute(["admin", "super_admin"]),
    (req, res) => UserService.getAll(req, res)
  );

  /**
   * @openapi
   * /user:
   *  get:
   *    description: Este endpoint serve para recuperar um cliente.
   *    tags: ["Admin", "Instalador", "Cliente"]
   *    parameters:
   *      - in: query
   *        name: userId
   *        schema:
   *          type: integer
   *        description: Id do usuário a ser recuperado
   *    responses:
   *      '200':
   *        description: Sucesso.
   *      '401':
   *        description: Não autorizado, token inválido ou expirado.
   */
  app.get("/user", AuthenticateRoute(["admin", "user"]), (req, res) =>
    UserService.get(req, res)
  );

  /**
   * @openapi
   * /user:
   *  post:
   *    description: Este endpoint serve para criar um cliente novo
   *    tags: ["Cliente", "Admin"]
   *    security: []
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
   *              name:
   *                type: string
   *              photo:
   *                type: string
   *              phone:
   *                type: string
   *              cpf:
   *                type: string
   *            required:
   *              - email
   *              - name
   *              - photo
   *              - phone:
   *              - cpf
   *    responses:
   *      '200':
   *        description: Sucesso.
   *      '401':
   *        description: Não autorizado, token inválido ou expirado.
   */
  app.post("/user", (req, res) => UserService.create(req, res));

  /**
   * @openapi
   * /admin/user:
   *  post:
   *    description: Este endpoint serve para criar um cliente novo a partir da área adminsitrativa
   *    tags: ["Admin"]
   *    requestBody:
   *      required: true
   *      content:
   *        application/json:
   *          schema:
   *            type: object
   *            properties:
   *              email:
   *                type: string
   *              name:
   *                type: string
   *              photo:
   *                type: string
   *              phone:
   *                type: string
   *              cpf:
   *                type: string
   *    responses:
   *      '200':
   *        description: Sucesso.
   *      '401':
   *        description: Não autorizado, token inválido ou expirado.
   */
  app.post(
    "/admin/user",
    AuthenticateRoute(["admin", "super_admin"]),
    (req, res) => UserService.createFromAdmin(req, res)
  );

  /**
   * @openapi
   * /user/authenticate:
   *  post:
   *    description: Endpoint de autenticação do cliente! Retorna o Token para ser usado em outras requests.
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
   *    responses:
   *      '200':
   *        description: Login efetuado com sucesso.
   *      '401':
   *        description: Não autorizado.
   *      '500':
   *        description: Erro.
   */
  app.post("/user/authenticate", (req, res) =>
    UserService.authenticate(req, res)
  );

  /**
   * @openapi
   * /user/reset-password:
   *  post:
   *    description: Endpoint de recuperação de senha do Cliente! Envia e-mail com nova senha
   *    security: []
   *    tags: ["Cliente"]
   *    requestBody:
   *      required: true
   *      content:
   *        application/json:
   *          schema:
   *            type: object
   *            properties:
   *              email:
   *                type: string
   *    responses:
   *      '200':
   *        description: E-mail enviado com sucesso.
   *      '400':
   *        description: Parâmetro E-mail não enviado ou usuário não encontrado.
   *      '500':
   *        description: Erro. E-mail não enviado.
   *
   */
  app.post("/user/reset-password", (req, res) =>
    UserService.resetPassword(req, res)
  );

  /**
   * @openapi
   * /user:
   *  put:
   *    description: Endpoint de atualização do cliente! Retorna os dados atualizados.
   *    tags: ["Cliente", "Admin"]
   *    parameters:
   *      - in: query
   *        name: userId
   *        schema:
   *          type: integer
   *        required: false
   *        description: ID do cliente em questão. Enviar se chamado por Admin.
   *    requestBody:
   *      required: true
   *      content:
   *        application/json:
   *          schema:
   *            type: object
   *            properties:
   *              name:
   *                type: string
   *              email:
   *                type: string
   *              password:
   *                type: string
   *              photo:
   *                type: string
   *              cpf:
   *                type: string
   *              phone:
   *                type: string
   *              isResetPassword:
   *                type: integer
   *    responses:
   *      '200':
   *        description: Atualização efetuada com sucesso.
   *      '401':
   *        description: Não autorizado.
   *      '500':
   *        description: Erro.
   */
  app.put("/user", AuthenticateRoute(["user", "admin"]), (req, res) =>
    UserService.update(req, res)
  );
};
