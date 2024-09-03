const UserMainGrid = require("../services/user-main-grid.service");

module.exports = (app) => {
  const UserMainGridService = new UserMainGrid();

  app.post("/user-main-grid", (req, res) =>
    UserMainGridService.create(req, res)
  );
  app.get("/user-main-grid", (req, res) =>
    UserMainGridService.getAll(req, res)
  );
  app.get("/user-main-grid/:id", (req, res) =>
    UserMainGridService.getOne(req, res)
  );
  app.put("/user-main-grid/:id", (req, res) =>
    UserMainGridService.updateById(req, res)
  );
  app.delete("/user-main-grid/:id", (req, res) =>
    UserMainGridService.deleteById(req, res)
  );
};
