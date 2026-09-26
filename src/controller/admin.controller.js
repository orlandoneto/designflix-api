const Admin = require("../services/admin.service");
const AuthenticateRoute = require("../middleware/authentication");
const { ROLES } = require("../utils/constants/constants");

module.exports = (app) => {
  const AdminService = new Admin();

  app.get("/admin", AuthenticateRoute([ROLES.SUPER_ADMIN]), (req, res) =>
    AdminService.get(req, res)
  );

  /**
   * @openapi
   * /admin:
   *  post:
   *    description: Cria um administrador (sempre admin comum). Só super_admin.
   *    tags: ["Admin"]
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
   *    responses:
   *      '200':
   *        description: Administrador criado.
   *      '400':
   *        description: Dados inválidos ou e-mail já cadastrado.
   *      '401':
   *        description: Sem token / token inválido.
   *      '403':
   *        description: Token válido, mas não é super_admin.
   */
  app.post("/admin", AuthenticateRoute([ROLES.SUPER_ADMIN]), (req, res) =>
    AdminService.create(req, res)
  );

  /**
   * @openapi
   * /admin/authenticate:
   *  post:
   *    description: Login do admin. Retorna o token para as outras requests.
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
   *        description: E-mail ou senha incorretos.
   *      '500':
   *        description: Erro interno do servidor.
   */
  app.post("/admin/authenticate", (req, res) =>
    AdminService.authenticate(req, res)
  );

  /**
   * @openapi
   * /admin/reset-password:
   *  post:
   *    description: Pede o link de redefinição de senha do admin. Resposta sempre igual (não revela se o e-mail existe).
   *    security: []
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
   *    responses:
   *      '200':
   *        description: Mensagem genérica (e-mail enviado se a conta existir).
   *      '400':
   *        description: E-mail não informado.
   */
  app.post("/admin/reset-password", (req, res) =>
    AdminService.requestPasswordReset(req, res)
  );

  /**
   * @openapi
   * /admin/reset-password/validate:
   *  post:
   *    description: Confere se o token do link ainda é válido.
   *    security: []
   *    tags: ["Admin"]
   *    responses:
   *      '200':
   *        description: Token válido.
   *      '400':
   *        description: Link inválido ou expirado.
   */
  app.post("/admin/reset-password/validate", (req, res) =>
    AdminService.validateResetToken(req, res)
  );

  /**
   * @openapi
   * /admin/reset-password/confirm:
   *  post:
   *    description: Define a nova senha com o token do link (uso único).
   *    security: []
   *    tags: ["Admin"]
   *    requestBody:
   *      required: true
   *      content:
   *        application/json:
   *          schema:
   *            type: object
   *            properties:
   *              token:
   *                type: string
   *              password:
   *                type: string
   *              confirmPassword:
   *                type: string
   *    responses:
   *      '200':
   *        description: Senha redefinida.
   *      '400':
   *        description: Senha inválida ou link inválido/expirado.
   */
  app.post("/admin/reset-password/confirm", (req, res) =>
    AdminService.confirmPasswordReset(req, res)
  );

  app.put("/admin", AuthenticateRoute([ROLES.SUPER_ADMIN]), (req, res) =>
    AdminService.update(req, res)
  );
};
