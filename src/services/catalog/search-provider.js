/**
 * Factory do provider de busca do catálogo.
 *
 * CATALOG_SEARCH_PROVIDER=
 *   mysql       → só MySQL
 *   meilisearch → Meili com fallback MySQL se down
 *   auto        → tenta Meili se MEILI_HOST setado
 */

function resolveProviderName() {
  const raw = String(process.env.CATALOG_SEARCH_PROVIDER || 'auto').toLowerCase();
  if (raw === 'meilisearch' || raw === 'meili') return 'meilisearch';
  if (raw === 'auto') return 'auto';
  return 'mysql';
}

function createSearchProvider() {
  const name = resolveProviderName();

  if (name === 'meilisearch' || name === 'auto') {
    try {
      // eslint-disable-next-line global-require
      return require('./meilisearch-search-provider');
    } catch (err) {
      console.warn('[catalog] Meilisearch provider falhou ao carregar:', err.message);
    }
  }

  // eslint-disable-next-line global-require
  return require('./mysql-search-provider');
}

module.exports = {
  resolveProviderName,
  createSearchProvider,
};
