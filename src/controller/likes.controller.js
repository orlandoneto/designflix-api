const UserLikesServices = require('../services/likes.services');
const AuthenticateRoute = require('../middleware/authentication');

module.exports = (app) => {
  app.post('/user/likes', AuthenticateRoute(['user']), (req, res) =>
    UserLikesServices.create(req, res)
  );

  app.get(
    '/user/likes/:user_id/main_grid/:user_main_grid_id',
    AuthenticateRoute(['user']),
    (req, res) => UserLikesServices.getById(req, res)
  );

  app.delete(
    '/user/likes/:user_id/main_grid/:user_main_grid_id',
    AuthenticateRoute(['user']),
    (req, res) => UserLikesServices.delete(req, res)
  );
};
