const UserAddres = require("../services/user-address.service");
const AuthenticateRoute = require("../middleware/authentication");

module.exports = (app) => {
  const UserAddresService = new UserAddres();

  app.post("/user/address", AuthenticateRoute(["user"]), (req, res) =>
    UserAddresService.create(req, res)
  );

  app.post(
    "/admin/user/address",
    AuthenticateRoute(["admin", "super_admin"]),
    (req, res) => UserAddresService.createFromAdmin(req, res)
  );

  app.get(
    "/user/address",
    AuthenticateRoute(["admin", "super_admin", "user"]),
    (req, res) => UserAddresService.getAllByUserId(req, res)
  );

  app.put(
    "/user/address/:id",
    AuthenticateRoute(["admin", "super_admin", "user"]),
    (req, res) => UserAddresService.updateById(req, res)
  );

  app.delete(
    "/user/address/:id",
    AuthenticateRoute(["admin", "super_admin", "user"]),
    (req, res) => UserAddresService.deleteById(req, res)
  );
};
