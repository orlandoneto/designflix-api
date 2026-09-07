const MarketingCalendarService = require('../services/marketing-calendar.service');
const AuthenticateRoute = require('../middleware/authentication');

module.exports = (app) => {
  /** Público — home */
  app.get('/marketing-calendar', (req, res) =>
    MarketingCalendarService.listPublic(req, res)
  );

  /** Admin CRUD */
  app.get(
    '/admin/marketing-calendar',
    AuthenticateRoute(['admin', 'super_admin']),
    (req, res) => MarketingCalendarService.listAdmin(req, res)
  );

  app.post(
    '/admin/marketing-calendar/regenerate',
    AuthenticateRoute(['admin', 'super_admin']),
    (req, res) => MarketingCalendarService.regenerate(req, res)
  );

  app.post(
    '/admin/marketing-calendar',
    AuthenticateRoute(['admin', 'super_admin']),
    (req, res) => MarketingCalendarService.create(req, res)
  );

  app.put(
    '/admin/marketing-calendar/:id',
    AuthenticateRoute(['admin', 'super_admin']),
    (req, res) => MarketingCalendarService.update(req, res)
  );

  app.delete(
    '/admin/marketing-calendar/:id',
    AuthenticateRoute(['admin', 'super_admin']),
    (req, res) => MarketingCalendarService.remove(req, res)
  );
};
