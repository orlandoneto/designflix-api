const ProductCategory = require("../services/product-category.service");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  const ProductCategoryService = new ProductCategory();

  app.post("/product-category", AuthenticateRoute(['admin', 'super_admin']), (req, res) =>
    ProductCategoryService.create(req, res)
  );
/**
 * @openapi
 * /product-category:
 *  get:
 *    description: Este endpoint serve para recuperar os dados de todas categorias.
 *    tags: ["Instalador", "Admin", "Cliente"]
 *    responses:
 *      '200':
 *        description: Sucesso.
 *      '401':
 *        description: Não autorizado, token inválido ou expirado.
 */
  app.get("/product-category", AuthenticateRoute(['admin', 'super_admin', 'installer', 'user']), (req, res) =>
    ProductCategoryService.getAll(req, res)
  );

/**
 * @openapi
 * /product-category/{id}:
 *  get:
 *    description: Este endpoint serve para recuperar os dados de uma categoria.
 *    tags: ["Instalador", "Admin", "Cliente"]
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID da categoria em questão.
 *    responses:
 *      '200':
 *        description: Sucesso.
 *      '401':
 *        description: Não autorizado, token inválido ou expirado.
 */
  app.get("/product-category/:id", AuthenticateRoute(['admin', 'super_admin', 'installer', 'user']), (req, res) =>
    ProductCategoryService.getOne(req, res)
  );
  app.put("/product-category/:id", AuthenticateRoute(['admin', 'super_admin']), (req, res) =>
    ProductCategoryService.updateById(req, res)
  );
  app.delete("/product-category/:id", AuthenticateRoute(['admin', 'super_admin']), (req, res) =>
    ProductCategoryService.deleteById(req, res)
  );
};
