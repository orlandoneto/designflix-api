const UserCreditCard = require("../services/user-credit-card.service");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  const UserCreditCardService = new UserCreditCard();

 /**
 * @openapi
 * /user/credit_card:
 *  post:
 *    description: Este endpoint serve para adicionar um cartão de crédito num cliente existente.
 *    tags: ["Admin", "Cliente"]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              name:
 *                type: string
 *              user_id:
 *                type: integer
 *              number:
 *                type: integer
 *              month: 
 *                type: string
 *              year:
 *                type: string
 *              type:
 *                type: string
 *    responses:
 *      '200':
 *        description: Sucesso.
 *      '401':
 *        description: Não autorizado, token inválido ou expirado.
 */
  app.post("/user/credit_card", AuthenticateRoute(['admin', 'super_admin', 'user']), (req, res) =>
    UserCreditCardService.create(req, res)
  );

  
  app.get("/user/credit_card", AuthenticateRoute(['admin', 'super_admin', 'user']), (req, res) =>
    UserCreditCardService.getAllByUserId(req, res)
  );

  /**
 * @openapi
 * /user/credit_card/{id}:
 *  put:
 *    description: Este endpoint serve para editar um cartão de crédito de um cliente existente.
 *    tags: ["Admin", "Cliente"]
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID do Cartão a ser atualizado.
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              name:
 *                type: string
 *              number:
 *                type: integer
 *              month: 
 *                type: string
 *              year:
 *                type: string
 *              type:
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
  app.put("/user/credit_card/:id", AuthenticateRoute(['admin', 'super_admin', 'user']), (req, res) =>
    UserCreditCardService.updateById(req, res)
  );


  
  app.delete("/user/credit_card/:id", AuthenticateRoute(['admin', 'super_admin', 'user']), (req, res) =>
    UserCreditCardService.deleteById(req, res)
  );
};
