const Product = require("../services/product.service");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  const ProductService = new Product();

  app.post("/product", AuthenticateRoute(['admin', 'super_admin']), (req, res) =>
    ProductService.create(req, res)
  );
  app.get("/product", AuthenticateRoute(['admin', 'super_admin', 'installer', 'user']), (req, res) =>
    ProductService.getAll(req, res)
  );
  app.put("/product/:id", AuthenticateRoute(['admin', 'super_admin']), (req, res) =>
    ProductService.updateById(req, res)
  );
  app.delete("/product/:id", AuthenticateRoute(['admin', 'super_admin',]), (req, res) =>
    ProductService.deleteById(req, res)
  );
};
