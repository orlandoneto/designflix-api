const RatingsService = require('../services/ratings.service');
const AuthenticateRoute = require('../middleware/authentication');

module.exports = (app) => {
  app.post('/user/ratings', AuthenticateRoute(['user']), (req, res) =>
    RatingsService.upsert(req, res)
  );

  app.get(
    '/user/ratings/main_grid/:user_main_grid_id',
    AuthenticateRoute(['user']),
    (req, res) => RatingsService.getMine(req, res)
  );
};
