const Treinamento = require("../services/treinamento.service");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  const TreinamentoService = new Treinamento();

  app.post("/treinamentos", AuthenticateRoute(['admin', 'super_admin']), (req, res) =>
  TreinamentoService.create(req, res)
  );
  app.get("/treinamentos", AuthenticateRoute(['admin', 'super_admin', 'installer']), (req, res) =>
  TreinamentoService.getAll(req, res)
  );


  
  
  /**
 * @openapi
 * /treinamentos/agenda:
 *  post:
 *    description: Endpoint de recuperação da agenda do treinamento. Retorna status de inscrição do instalador que chamou.
 *    tags: ["Instalador"]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              month:
 *                type: integer
 *              year:
 *                type: integer
 *    responses:
 *      '200':
 *        description: Sucesso.
 *      '500':
 *        description: Erro.
 * 
 */
  app.post("/treinamentos/agenda", AuthenticateRoute(['installer']), (req, res) =>
  TreinamentoService.getByDate(req, res)
  );




    /**
 * @openapi
 * /treinamentos/historico:
 *  post:
 *    description: Endpoint de recuperação de historico de treinamentos. Retorna status do instalador que chamou.
 *    tags: ["Instalador"]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              month:
 *                type: integer
 *              year:
 *                type: integer
 *    responses:
 *      '200':
 *        description: Sucesso.
 *      '500':
 *        description: Erro.
 * 
 */
  app.post("/treinamentos/historico", AuthenticateRoute(['installer']), (req, res) =>
  TreinamentoService.getDoneByDate(req, res)
  );



  app.get("/treinamentos/:id", AuthenticateRoute(['admin', 'super_admin', 'installer']), (req, res) =>
  TreinamentoService.getOne(req, res)
  );
  app.get("/treinamentos/inscritos/:id", AuthenticateRoute(['admin', 'super_admin']), (req, res) =>
  TreinamentoService.getInscritos(req, res)
  );
  app.put("/treinamentos/:id", AuthenticateRoute(['admin', 'super_admin']), (req, res) =>
  TreinamentoService.updateById(req, res)
  );
  app.delete("/treinamentos/:id", AuthenticateRoute(['admin', 'super_admin']), (req, res) =>
  TreinamentoService.deleteById(req, res)
  );
};
