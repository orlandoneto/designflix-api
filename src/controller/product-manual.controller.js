const ProductManual = require("../services/product-manual.service");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  const ProductManualService = new ProductManual();

  app.post("/product/manual", AuthenticateRoute(['admin', 'super_admin']), (req, res) =>
    ProductManualService.create(req, res)
  );
  app.get("/product/manual/:product_id", AuthenticateRoute(['admin', 'super_admin', 'installer', 'user']), (req, res) =>
    ProductManualService.getAllByProductId(req, res)
  );
  app.get("/product/manual", AuthenticateRoute(['admin', 'super_admin', 'installer', 'user']), (req, res) =>
    ProductManualService.getAll(req, res)
  );
  app.get("/product/manual/:id", AuthenticateRoute(['admin', 'super_admin', 'installer', 'user']), (req, res) =>
    ProductManualService.getOne(req, res)
  );
  app.put("/product/manual/:id", AuthenticateRoute(['admin', 'super_admin']), (req, res) =>
    ProductManualService.updateById(req, res)
  );
  app.delete("/product/manual/:id", AuthenticateRoute(['admin', 'super_admin']), (req, res) =>
    ProductManualService.deleteById(req, res)
  );
};
