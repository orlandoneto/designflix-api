const { normalizeCatalogSearchParams } = require('./catalog-query');
const { ensureIndex, pingMeili, searchIndex } = require('./meili-client');
const mysqlProvider = require('./mysql-search-provider');
const { mapBrowserAssetUrls } = require('../../utils/objectStorage');

function buildMeiliFilter(params, categoryId) {
  const parts = ['activite = 0'];
  if (params.format) {
    const fmt = params.format.toUpperCase();
    if (fmt === 'JPG' || fmt === 'JPEG') {
      parts.push('(format = "JPG" OR format = "JPEG")');
    } else {
      parts.push(`format = "${fmt}"`);
    }
  }
  if (params.availability) {
    parts.push(`availability = "${params.availability}"`);
  }
  if (categoryId) {
    parts.push(`category_ids = ${Number(categoryId)}`);
  } else if (params.categorySlug) {
    parts.push(`category_slugs = "${params.categorySlug.toLowerCase()}"`);
  }
  return parts.join(' AND ');
}

function mapHit(hit) {
  return mapBrowserAssetUrls({
    id: hit.id,
    name: hit.name,
    format: hit.format,
    availability: hit.availability,
    url_thumb: hit.url_thumb,
    url_cover: hit.url_cover,
    url: hit.url,
    count_download: hit.count_download,
    categories: (hit.category_names || []).map((name, i) => ({
      id: hit.category_ids?.[i] ?? null,
      name,
      slug: hit.category_slugs?.[i] ?? null,
    })),
  });
}

async function search(rawQuery) {
  const healthy = await pingMeili();
  if (!healthy) {
    return mysqlProvider.search(rawQuery);
  }

  const params = normalizeCatalogSearchParams(rawQuery);
  const categoryId = await mysqlProvider.resolveCategoryId(params);

  await ensureIndex();

  const sort =
    params.sort === 'downloads'
      ? ['count_download:desc']
      : params.sort === 'recent'
        ? ['created_at:desc']
        : undefined;

  const result = await searchIndex(params.q || '', {
    filter: buildMeiliFilter(params, categoryId),
    limit: params.limit,
    offset: params.offset,
    sort,
  });

  return {
    data: (result.hits || []).map(mapHit),
    pagination: {
      page: params.page,
      limit: params.limit,
      total: result.estimatedTotalHits ?? result.hits?.length ?? 0,
      totalPages: Math.max(
        1,
        Math.ceil((result.estimatedTotalHits || 0) / params.limit) || 1
      ),
    },
    meta: {
      provider: 'meilisearch',
      filters: { ...params, categoryId },
    },
  };
}

async function facets(rawQuery) {
  const healthy = await pingMeili();
  if (!healthy) {
    return mysqlProvider.facets(rawQuery);
  }

  const params = normalizeCatalogSearchParams(rawQuery);
  const categoryId = await mysqlProvider.resolveCategoryId(params);

  const filterParts = ['activite = 0'];
  if (categoryId) filterParts.push(`category_ids = ${Number(categoryId)}`);
  else if (params.categorySlug) {
    filterParts.push(`category_slugs = "${params.categorySlug.toLowerCase()}"`);
  }

  const result = await searchIndex(params.q || '', {
    filter: filterParts.join(' AND '),
    limit: 0,
    facets: ['format', 'availability', 'primary_category_slug'],
  });

  const dist = result.facetDistribution || {};
  const formats = Object.entries(dist.format || {}).map(([value, count]) => ({
    value: String(value).toUpperCase(),
    count: Number(count),
  }));
  const availability = Object.entries(dist.availability || {}).map(([value, count]) => ({
    value,
    count: Number(count),
  }));

  let categories = [];
  try {
    const mysqlFacets = await mysqlProvider.facets(rawQuery);
    categories = mysqlFacets.categories || [];
  } catch {
    categories = Object.entries(dist.primary_category_slug || {}).map(([slug, count]) => ({
      id: null,
      name: slug,
      slug,
      count: Number(count),
    }));
  }

  return { formats, availability, categories };
}

async function getById(id) {
  return mysqlProvider.getById(id);
}

async function findSimilar(id, options) {
  // Similaridade multi-sinal usa MySQL (fonte da verdade + tags/categorias).
  return mysqlProvider.findSimilar(id, options);
}

module.exports = {
  search,
  facets,
  getById,
  findSimilar,
  buildMeiliFilter,
  mapHit,
};
