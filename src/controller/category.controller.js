const CategoryService = require("../services/category.service");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  const categoryService = new CategoryService();

  app.post("/categories", AuthenticateRoute(["admin", "user"]), (req, res) =>
    categoryService.create(req, res)
  );

  app.get("/categories", AuthenticateRoute(["admin", "user"]), (req, res) =>
    categoryService.getAll(req, res)
  );

  app.get("/categories/grouped", (req, res) =>
    categoryService.getCategoriesInGroups(req, res)
  );

  app.get("/categories/grouped/filter", (req, res) =>
    categoryService.getCategoriesInGroupsFilter(req, res)
  );

  app.get("/categories/:id", AuthenticateRoute(["admin", "user"]), (req, res) =>
    categoryService.getById(req, res)
  );

  app.put("/categories/:id", AuthenticateRoute(["admin"]), (req, res) =>
    categoryService.updateById(req, res)
  );

  app.delete("/categories/:id", AuthenticateRoute(["admin"]), (req, res) =>
    categoryService.deleteById(req, res)
  );
};
