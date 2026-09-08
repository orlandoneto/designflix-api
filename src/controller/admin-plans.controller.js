/**
 * Catálogo de planos: leitura pública + CRUD do admin.
 *
 * Não existe rota de sync com gateway — o Asaas não tem catálogo remoto.
 *
 * @see docs/contextos/plans.md
 */

const AdminPlansService = require('../services/admin-plans.service');
const AuthenticateRoute = require('../middleware/authentication');

/**
 * Planos são dado de produto, então seguem a régua de `/admin/users`:
 * `admin` e `super_admin`. O gate exclusivo de `super_admin` é reservado para
 * gerenciar os próprios admins (`GET /admin`, `PUT /admin`).
 */
const ADMIN_PLANS_ROLES = ['admin', 'super_admin'];

module.exports = (app) => {
  // Público: alimenta a página de planos do site.
  app.get('/plans', (req, res) => AdminPlansService.listPublic(req, res));

  app.get('/admin/plans', AuthenticateRoute(ADMIN_PLANS_ROLES), (req, res) =>
    AdminPlansService.listAdmin(req, res)
  );

  app.get(
    '/admin/plans/:id',
    AuthenticateRoute(ADMIN_PLANS_ROLES),
    (req, res) => AdminPlansService.getById(req, res)
  );

  app.post('/admin/plans', AuthenticateRoute(ADMIN_PLANS_ROLES), (req, res) =>
    AdminPlansService.create(req, res)
  );

  app.put(
    '/admin/plans/:id',
    AuthenticateRoute(ADMIN_PLANS_ROLES),
    (req, res) => AdminPlansService.update(req, res)
  );

  app.delete(
    '/admin/plans/:id',
    AuthenticateRoute(ADMIN_PLANS_ROLES),
    (req, res) => AdminPlansService.remove(req, res)
  );
};
