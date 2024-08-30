const ProductFaq = require("../services/product-faq.service");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  const ProductFaqService = new ProductFaq();

  app.post("/product/faq", AuthenticateRoute(['admin', 'super_admin']), (req, res) =>
    ProductFaqService.create(req, res)
  );
  app.get("/product/faq", AuthenticateRoute(['admin', 'super_admin', 'installer', 'user']), (req, res) =>
    ProductFaqService.getAll(req, res)
  );
  app.put("/product/faq/:id", AuthenticateRoute(['admin', 'super_admin']), (req, res) =>
    ProductFaqService.updateById(req, res)
  );
  app.delete("/product/faq/:id", AuthenticateRoute(['admin', 'super_admin']), (req, res) =>
    ProductFaqService.deleteById(req, res)
  );
};
