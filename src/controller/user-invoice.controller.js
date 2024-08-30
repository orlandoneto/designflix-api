const UserInvoice = require("../services/user-invoice.service");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  const UserInvoiceService = new UserInvoice();
/**
 * @openapi
 * /user/invoice:
 *  post:
 *    description: Endpoint de criação de uma nota fiscal com produtos.
 *    tags: ["Cliente"]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              cnpj:
 *                type: string
 *              invoice_number:
 *                type: string
 *              invoice_date:
 *                type: string
 *              motor_quantity:
 *                type: integer
 *              remote_control_quantity:
 *                type: integer
 *              photo:
 *                type: string
 *              products:
 *                type: array
 *                items:
 *                  type: object
 *                  properties:
 *                    product_id:
 *                      type: integer 
 *                    quantity:
 *                      type: integer
 *    responses:
 *      '200':
 *        description: Sucesso. Retorna objeto criado
 *      '401':
 *        description: Não autorizado.
 *      '500':
 *        description: Erro.
 */
  app.post("/user/invoice", AuthenticateRoute(['user']), (req, res) =>
    UserInvoiceService.create(req, res)
  );

/**
 * @openapi
 * /user/invoice:
 *  get:
 *    description: Endpoint retorna a listagem de invoices de um cliente.
 *    tags: ["Cliente"]
 *    responses:
 *      '200':
 *        description: Sucesso. Retorna objeto criado
 *      '401':
 *        description: Não autorizado.
 *      '500':
 *        description: Erro.
 */
  app.get("/user/invoice", AuthenticateRoute(['admin', 'super_admin', 'user']), (req, res) =>
    UserInvoiceService.getAllByUserId(req, res)
  );


  app.put("/user/invoice/:id", AuthenticateRoute(['admin', 'super_admin', 'user']), (req, res) =>
    UserInvoiceService.updateById(req, res)
  );
  app.delete("/user/invoice/:id", AuthenticateRoute(['admin', 'super_admin', 'user']), (req, res) =>
    UserInvoiceService.deleteById(req, res)
  );
};
