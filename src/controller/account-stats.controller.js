const AccountStatsServices = require('../services/account-stats.service');
const AuthenticateRoute = require('../middleware/authentication');

module.exports = (app) => {
  app.get('/user/account/stats', AuthenticateRoute(['user']), (req, res) =>
    AccountStatsServices.getMine(req, res)
  );
};
