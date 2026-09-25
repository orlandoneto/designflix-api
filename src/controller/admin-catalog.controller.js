/**
 * Catálogo admin — listagem, desabilitar e remover (com R2).
 * @see docs/contextos/admin-catalog.md
 */

const AdminCatalogService = require('../services/admin-catalog.service');
const AuthenticateRoute = require('../middleware/authentication');

const ADMIN_CATALOG_ROLES = ['admin', 'super_admin'];

module.exports = (app) => {
  app.get(
    '/admin/catalog',
    AuthenticateRoute(ADMIN_CATALOG_ROLES),
    (req, res) => AdminCatalogService.list(req, res)
  );

  app.patch(
    '/admin/catalog/:id',
    AuthenticateRoute(ADMIN_CATALOG_ROLES),
    (req, res) => AdminCatalogService.setDisabled(req, res)
  );

  app.delete(
    '/admin/catalog/:id',
    AuthenticateRoute(ADMIN_CATALOG_ROLES),
    (req, res) => AdminCatalogService.remove(req, res)
  );
};
