const RedisCache = require('../../utils/redisCache');

/**
 * Chave de cache estável para search/facets (inclui todos os filtros).
 * @param {string} entity
 * @param {Record<string, unknown>} params
 */
function buildCatalogCacheKey(entity, params = {}) {
  const env = process.env.NODE_ENV || 'development';
  const entityName = env === 'development' ? `${entity}_dev` : entity;
  const parts = [
    entityName,
    params.q || 'null',
    params.format || 'null',
    params.categoryId || params.categorySlug || 'null',
    params.availability || 'null',
    params.sort || 'null',
    params.page || 1,
    params.limit || 40,
  ];
  return parts.join(':');
}

async function getCached(redis, key) {
  return RedisCache.getFromCache(redis, key);
}

function setCached(redis, key, data, ttl = 300) {
  RedisCache.saveToCache(redis, key, data, ttl);
}

module.exports = {
  buildCatalogCacheKey,
  getCached,
  setCached,
};
