const CatalogService = require('../services/catalog/catalog.service');

module.exports = (app) => {
  const catalog = new CatalogService();

  app.get('/catalog/search', (req, res) => catalog.search(req, res));
  app.get('/catalog/facets', (req, res) => catalog.facets(req, res));
  app.get('/catalog/:id', (req, res) => catalog.getById(req, res));
};
