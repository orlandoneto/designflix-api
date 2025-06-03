const Admin = require("../services/admin.service");
const AuthenticateRoute = require("../middleware/authentication");
const verifyRecaptcha = require("../middleware/recaptcha");

module.exports = (app) => {
  const AdminService = new Admin();

  app.get("/admin", AuthenticateRoute(["super_admin"]), (req, res) =>
    AdminService.get(req, res)
  );
  app.post("/admin", (req, res) => AdminService.create(req, res));

  /**
   * @openapi
   * /admin/authenticate:
   *  post:
   *    description: Endpoint de autenticação do admin! Retorna o Token para ser usado em outras requests.
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
  app.post("/admin/authenticate", verifyRecaptcha('admin-login'), (req, res) =>
    AdminService.authenticate(req, res)
  );

  /**
   * @openapi
   * /admin/reset-password:
   *  post:
   *    description: Endpoint de recuperação de senha do admin! Envia e-mail com nova senha
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
   *        description: E-mail enviado com sucesso.
   *      '400':
   *        description: Parâmetro E-mail não enviado ou usuário não encontrado.
   *      '500':
   *        description: Erro. E-mail não enviado.
   */
  app.post("/admin/reset-password", (req, res) =>
    AdminService.resetPassword(req, res)
  );

  app.put("/admin", AuthenticateRoute(["super_admin"]), (req, res) =>
    AdminService.update(req, res)
  );
};
