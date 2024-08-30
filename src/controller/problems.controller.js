const Problems = require("../services/problems.service");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  const ProblemsService = new Problems();

  /**
 * @openapi
 * /problem:
 *  post:
 *    description: Este endpoint serve para criar um novo problema.
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
 *    responses:
 *      '200':
 *        description: Sucesso.
 *      '401':
 *        description: Não autorizado, token inválido ou expirado.
 */
  app.post("/problem", AuthenticateRoute(['admin', 'super_admin']), (req, res) =>
    ProblemsService.create(req, res)
  );

/**
 * @openapi
 * /problem:
 *  get:
 *    description: Este endpoint serve para listar os problemas.
 *    tags: ["Admin", "Instalador", "Cliente"]
 *    responses:
 *      '200':
 *        description: Sucesso.
 *      '401':
 *        description: Não autorizado, token inválido ou expirado.
 */
  app.get("/problem", AuthenticateRoute(['admin', 'super_admin', 'installer', 'user']), (req, res) =>
    ProblemsService.getAll(req, res)
  );


/**
 * @openapi
 * /problem/{id}:
 *  get:
 *    description: Este endpoint serve para recuperar um problema por seu id.
 *    tags: ["Admin", "Instalador", "Cliente"]
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: string
 *        required: true
 *        description: ID do problema em questão.
 *    responses:
 *      '200':
 *        description: Sucesso.
 *      '401':
 *        description: Não autorizado, token inválido ou expirado.
 */  
  app.get("/problem/:id", AuthenticateRoute(['admin', 'super_admin', 'installer', 'user']), (req, res) =>
    ProblemsService.getOne(req, res)
  );

/**
 * @openapi
 * /problem/{id}:
 *  put:
 *    description: Este endpoint serve para atualizar um problema por seu id.
 *    tags: ["Admin"]
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: string
 *        required: true
 *        description: ID do problema a ser atualizado.
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              name:
 *                type: string
 *    responses:
 *      '200':
 *        description: Sucesso.
 *      '401':
 *        description: Não autorizado, token inválido ou expirado.
 */  
  app.put("/problem/:id", AuthenticateRoute(['admin', 'super_admin']), (req, res) =>
    ProblemsService.updateById(req, res)
  );

 /**
 * @openapi
 * /problem/{id}:
 *  delete:
 *    description: Este endpoint serve para deletar um problema por seu id.
 *    tags: ["Admin"]
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: string
 *        required: true
 *        description: ID do problema em questão.
 *    responses:
 *      '200':
 *        description: Sucesso.
 *      '401':
 *        description: Não autorizado, token inválido ou expirado.
 */   
  app.delete("/problem/:id", AuthenticateRoute(['admin', 'super_admin']), (req, res) =>
    ProblemsService.deleteById(req, res)
  );
};
