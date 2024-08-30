const ProductVideo = require("../services/product-video.service");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  const ProductVideoService = new ProductVideo();

  app.post("/product/video", AuthenticateRoute(['admin', 'super_admin']), (req, res) =>
    ProductVideoService.create(req, res)
  );
  app.get("/product/video/:product_id", AuthenticateRoute(['admin', 'super_admin', 'installer', 'user']), (req, res) =>
    ProductVideoService.getAllByProductId(req, res)
  );
  app.get("/product/video", AuthenticateRoute(['admin', 'super_admin', 'installer', 'user']), (req, res) =>
    ProductVideoService.getAll(req, res)
  );
  app.get("/product/video/:id", AuthenticateRoute(['admin', 'super_admin', 'installer', 'user']), (req, res) =>
  ProductVideoService.getOne(req, res)
  );
  app.put("/product/video/:id", AuthenticateRoute(['admin', 'super_admin']), (req, res) =>
    ProductVideoService.updateById(req, res)
  );
  app.delete("/product/video/:id", AuthenticateRoute(['admin', 'super_admin']), (req, res) =>
    ProductVideoService.deleteById(req, res)
  );
};
