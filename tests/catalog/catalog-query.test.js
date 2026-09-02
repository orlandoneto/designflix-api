const {
  normalizeCatalogSearchParams,
  buildBooleanQuery,
  buildOrderSql,
} = require('../../src/services/catalog/catalog-query');
const { buildCatalogCacheKey } = require('../../src/services/catalog/catalog-cache');
const { resolveProviderName } = require('../../src/services/catalog/search-provider');
const RedisCache = require('../../src/utils/redisCache');

describe('catalog-query', () => {
  it('normaliza q/searchTerm e aliases', () => {
    expect(normalizeCatalogSearchParams({ q: '  mockup  ' }).q).toBe('mockup');
    expect(normalizeCatalogSearchParams({ searchTerm: 'flyer' }).q).toBe('flyer');
    expect(normalizeCatalogSearchParams({ q: 'null' }).q).toBeNull();
    expect(normalizeCatalogSearchParams({ format: 'psd' }).format).toBe('PSD');
    expect(normalizeCatalogSearchParams({ format: 'all' }).format).toBeNull();
  });

  it('normaliza availability e sort default', () => {
    expect(normalizeCatalogSearchParams({ availability: 'gratis' }).availability).toBe('free');
    expect(normalizeCatalogSearchParams({ license: 'premium' }).availability).toBe('paid');
    expect(normalizeCatalogSearchParams({ q: 'x' }).sort).toBe('relevance');
    expect(normalizeCatalogSearchParams({}).sort).toBe('recent');
    expect(normalizeCatalogSearchParams({ sort: 'downloads' }).sort).toBe('downloads');
  });

  it('pagina com limite máximo 100', () => {
    const p = normalizeCatalogSearchParams({ page: 2, limit: 500 });
    expect(p.page).toBe(2);
    expect(p.limit).toBe(100);
    expect(p.offset).toBe(100);
  });

  it('buildBooleanQuery gera tokens com prefixo', () => {
    const r = buildBooleanQuery('mockup academia de');
    expect(r.hasBoolean).toBe(true);
    expect(r.booleanQuery).toContain('+mockup*');
    expect(r.booleanQuery).toContain('+academia*');
    expect(r.booleanQuery).not.toContain('+de*');
  });

  it('buildOrderSql respeita sort', () => {
    expect(buildOrderSql('downloads', false)).toContain('count_download');
    expect(buildOrderSql('recent', false)).toContain('created_at');
    expect(buildOrderSql('relevance', true)).toContain('phrase_hit');
  });
});

describe('catalog-cache', () => {
  it('inclui category e availability na chave', () => {
    const key = buildCatalogCacheKey('catalog_search', {
      q: 'mockup',
      format: 'PSD',
      categoryId: 3,
      availability: 'free',
      sort: 'downloads',
      page: 1,
      limit: 40,
    });
    expect(key).toContain('mockup');
    expect(key).toContain('PSD');
    expect(key).toContain('3');
    expect(key).toContain('free');
    expect(key).toContain('downloads');
  });

  it('RedisCache.generateCacheKey aceita objeto de filtros', () => {
    const key = RedisCache.generateCacheKey('catalog', {
      q: 'a',
      format: 'PNG',
      categoryId: 9,
      page: 2,
      limit: 20,
    });
    expect(key).toContain('PNG');
    expect(key).toContain('9');
    expect(key).toContain('2');
    expect(key).toContain('20');
  });
});

describe('search-provider factory', () => {
  const original = process.env.CATALOG_SEARCH_PROVIDER;

  afterEach(() => {
    if (original === undefined) delete process.env.CATALOG_SEARCH_PROVIDER;
    else process.env.CATALOG_SEARCH_PROVIDER = original;
  });

  it('default auto', () => {
    delete process.env.CATALOG_SEARCH_PROVIDER;
    expect(resolveProviderName()).toBe('auto');
  });

  it('aceita meilisearch', () => {
    process.env.CATALOG_SEARCH_PROVIDER = 'meilisearch';
    expect(resolveProviderName()).toBe('meilisearch');
  });

  it('aceita mysql explícito', () => {
    process.env.CATALOG_SEARCH_PROVIDER = 'mysql';
    expect(resolveProviderName()).toBe('mysql');
  });
});
