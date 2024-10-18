const UserAddres = require("../services/user-address.service");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  const UserAddresService = new UserAddres();

  /**
   * @openapi
   * /user/address:
   *  post:
   *    description: Este endpoint serve para um cliente adicionar um endereço próprio. Só pode ser enviado com token de cliente.
   *    tags: ["Cliente"]
   *    requestBody:
   *      required: true
   *      content:
   *        application/json:
   *          schema:
   *            type: object
   *            properties:
   *              name:
   *                type: string
   *              postalCode:
   *                type: integer
   *              isPrincipal:
   *                type: integer
   *              street:
   *                type: string
   *              number:
   *                type: integer
   *              complement:
   *                type: string
   *              district:
   *                type: string
   *              city:
   *                type: string
   *              state:
   *                type: string
   *              country:
   *                type: string
   *    responses:
   *      '200':
   *        description: Sucesso.
   *      '401':
   *        description: Não autorizado, token inválido ou expirado.
   */
  app.post("/user/address", AuthenticateRoute(["user"]), (req, res) =>
    UserAddresService.create(req, res)
  );

  /**
   * @openapi
   * /admin/user/address:
   *  post:
   *    description: Este endpoint serve para adicionar um endereço num cliente existente, pela área de admin. Só aceita token de admin.
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
   *              userId:
   *                type: integer
   *              postalCode:
   *                type: string
   *              isPrincipal:
   *                type: integer
   *              street:
   *                type: string
   *              number:
   *                type: integer
   *              complement:
   *                type: string
   *              district:
   *                type: string
   *              city:
   *                type: string
   *              state:
   *                type: string
   *              country:
   *                type: string
   *    responses:
   *      '200':
   *        description: Sucesso.
   *      '401':
   *        description: Não autorizado, token inválido ou expirado.
   */
  app.post(
    "/admin/user/address",
    AuthenticateRoute(["admin", "super_admin"]),
    (req, res) => UserAddresService.createFromAdmin(req, res)
  );

  app.get(
    "/user/address",
    AuthenticateRoute(["admin", "super_admin", "user"]),
    (req, res) => UserAddresService.getAllByUserId(req, res)
  );

  /**
   * @openapi
   * /user/address/{id}:
   *  put:
   *    description: Este endpoint serve para editar um endereço de um cliente existente.
   *    tags: ["Admin", "Cliente"]
   *    parameters:
   *      - in: path
   *        name: id
   *        schema:
   *          type: integer
   *        required: true
   *        description: ID do Endereço a ser atualizado.
   *    requestBody:
   *      required: true
   *      content:
   *        application/json:
   *          schema:
   *            type: object
   *            properties:
   *              name:
   *                type: string
   *              postalCode:
   *                type: string
   *              isPrincipal:
   *                type: integer
   *              street:
   *                type: string
   *              number:
   *                type: integer
   *              complement:
   *                type: string
   *              district:
   *                type: string
   *              city:
   *                type: string
   *              state:
   *                type: string
   *              country:
   *                type: string
   *    responses:
   *      '200':
   *        description: Sucesso.
   *      '400':
   *        description: Solicitação inválida.
   *      '401':
   *        description: Não autorizado, token inválido ou expirado.
   *      '500':
   *        description: Erro.
   */
  app.put(
    "/user/address/:id",
    AuthenticateRoute(["admin", "super_admin", "user"]),
    (req, res) => UserAddresService.updateById(req, res)
  );

  app.delete(
    "/user/address/:id",
    AuthenticateRoute(["admin", "super_admin", "user"]),
    (req, res) => UserAddresService.deleteById(req, res)
  );
};
