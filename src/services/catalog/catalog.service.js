const { createSearchProvider } = require('./search-provider');
const { buildCatalogCacheKey, getCached, setCached } = require('./catalog-cache');
const { normalizeCatalogSearchParams } = require('./catalog-query');
const { redactCleanFileUrlList } = require('./public-catalog-item');
const { clampLimit, DEFAULT_LIMIT } = require('./catalog-similar');
const { ok, badRequest, notFound, serverError } = require('../../utils/httpResponse');

function parsePositiveId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

module.exports = class CatalogService {
  constructor() {
    this.provider = createSearchProvider();
  }

  async search(req, res) {
    try {
      const params = normalizeCatalogSearchParams(req.query || {});

      if (req.query?.page != null && String(req.query.page).trim() !== '') {
        const pageNum = Number(req.query.page);
        if (!Number.isInteger(pageNum) || pageNum < 1) {
          return badRequest(res, 'Parâmetro page inválido');
        }
      }
      if (req.query?.limit != null && String(req.query.limit).trim() !== '') {
        const limitNum = Number(req.query.limit);
        if (!Number.isInteger(limitNum) || limitNum < 1) {
          return badRequest(res, 'Parâmetro limit inválido');
        }
      }

      const cacheKey = buildCatalogCacheKey('catalog_search', params);
      const cached = await getCached(req.redis, cacheKey);
      if (cached?.data) {
        return ok(res, {
          message: 'Busca realizada com sucesso',
          data: redactCleanFileUrlList(cached.data),
          pagination: cached.pagination,
          meta: cached.meta,
        });
      }

      const result = await this.provider.search(req.query || {});
      const safeData = redactCleanFileUrlList(result.data);
      const payload = {
        data: safeData,
        pagination: result.pagination,
        meta: result.meta,
      };
      setCached(req.redis, cacheKey, payload);

      return ok(res, {
        message: 'Busca realizada com sucesso',
        ...payload,
      });
    } catch (err) {
      console.error('[catalog/search]', err);
      return serverError(res, 'Erro ao buscar catálogo');
    }
  }

  async facets(req, res) {
    try {
      const params = normalizeCatalogSearchParams(req.query || {});
      const cacheKey = buildCatalogCacheKey('catalog_facets', {
        ...params,
        page: 1,
        limit: 1,
      });

      const cached = await getCached(req.redis, cacheKey);
      if (cached?.data) {
        return ok(res, {
          message: 'Facetas carregadas com sucesso',
          data: cached.data,
        });
      }

      const data = await this.provider.facets(req.query || {});
      setCached(req.redis, cacheKey, { data });
      return ok(res, {
        message: 'Facetas carregadas com sucesso',
        data,
      });
    } catch (err) {
      console.error('[catalog/facets]', err);
      return serverError(res, 'Erro ao buscar facetas');
    }
  }

  async getById(req, res) {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) {
        return badRequest(res, 'ID inválido');
      }

      const data = await this.provider.getById(id);
      if (!data) {
        return notFound(res, 'Arquivo não encontrado');
      }

      return ok(res, {
        message: 'Arquivo encontrado',
        data,
      });
    } catch (err) {
      console.error('[catalog/:id]', err);
      return serverError(res, 'Erro ao buscar detalhe');
    }
  }

  async getSimilar(req, res) {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) {
        return badRequest(res, 'ID inválido');
      }

      let limit = DEFAULT_LIMIT;
      if (req.query?.limit != null && String(req.query.limit).trim() !== '') {
        const limitNum = Number(req.query.limit);
        if (!Number.isInteger(limitNum) || limitNum < 1) {
          return badRequest(res, 'Parâmetro limit inválido');
        }
        limit = clampLimit(limitNum);
      }

      if (typeof this.provider.findSimilar !== 'function') {
        return serverError(res, 'Erro ao buscar semelhantes');
      }

      const result = await this.provider.findSimilar(id, { limit });
      if (!result) {
        return notFound(res, 'Arquivo não encontrado');
      }

      return ok(res, {
        message: 'Recursos semelhantes encontrados',
        data: redactCleanFileUrlList(result.data || []),
        meta: result.meta || { strategy: 'multi-signal' },
      });
    } catch (err) {
      console.error('[catalog/:id/similar]', err);
      return serverError(res, 'Erro ao buscar semelhantes');
    }
  }
};
