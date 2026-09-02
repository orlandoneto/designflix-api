/**
 * Normalização de query do catálogo público.
 * Independente de MySQL/Meilisearch — usado pelo controller e testes.
 */

function emptyToNull(value) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (!s || s === 'null' || s === 'undefined' || s === 'all') return null;
  return s;
}

function parsePositiveInt(value, fallback) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n < 1) return fallback;
  return n;
}

/**
 * @param {Record<string, unknown>} query
 */
function normalizeCatalogSearchParams(query = {}) {
  const q = emptyToNull(query.q ?? query.searchTerm);
  const format = emptyToNull(query.format);
  const categorySlug = emptyToNull(query.category ?? query.niche);
  const categoryIdRaw = emptyToNull(query.categoryId);
  const categoryId = categoryIdRaw ? parsePositiveInt(categoryIdRaw, null) : null;
  const availabilityRaw = emptyToNull(query.availability ?? query.license);
  let availability = null;
  if (availabilityRaw) {
    const a = availabilityRaw.toLowerCase();
    if (a === 'free' || a === 'gratis') availability = 'free';
    else if (a === 'paid' || a === 'premium' || a === 'pago') availability = 'paid';
  }

  const page = parsePositiveInt(query.page, 1);
  const limit = Math.min(parsePositiveInt(query.limit, 40), 100);

  let sort = emptyToNull(query.sort) || null;
  if (!sort) {
    sort = q ? 'relevance' : 'recent';
  }
  if (!['relevance', 'downloads', 'recent'].includes(sort)) {
    sort = q ? 'relevance' : 'recent';
  }

  return {
    q,
    format: format ? format.toUpperCase() : null,
    categoryId,
    categorySlug,
    availability,
    sort,
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

/**
 * Monta tokens BOOLEAN MODE (prefixo +) a partir do texto livre.
 */
function buildBooleanQuery(input) {
  const raw = String(input || '').trim();
  const normalized = raw.replace(/\s+/g, ' ').replace(/["'`]+/g, '');
  const stopwords = new Set([
    'a', 'o', 'as', 'os', 'e', 'de', 'do', 'da', 'dos', 'das', 'um', 'uma',
    'para', 'por', 'no', 'na', 'nos', 'nas', 'em', 'com', 'sem', 'ao', 'à', 'às', 'aos',
  ]);
  const tokens = normalized.split(' ').filter(Boolean);
  const booleanTokens = [];
  for (const t of tokens) {
    const token = t.toLowerCase();
    if (stopwords.has(token)) continue;
    if (token.length >= 3) booleanTokens.push(`+${token}*`);
  }
  const booleanQuery = booleanTokens.join(' ');
  return {
    booleanQuery,
    likeQuery: `%${normalized}%`,
    natQuery: normalized,
    hasBoolean: booleanQuery.length > 0,
  };
}

function buildOrderSql(sort, hasSearch) {
  if (sort === 'downloads') {
    return 'umg.count_download DESC, umg.created_at DESC';
  }
  if (sort === 'recent') {
    return 'umg.created_at DESC, umg.updated_at DESC';
  }
  // relevance
  if (hasSearch) {
    return 'phrase_hit DESC, score DESC, umg.count_download DESC, umg.created_at DESC';
  }
  return 'CASE WHEN umg.format = \'PSD\' THEN 0 ELSE 1 END, umg.created_at DESC';
}

module.exports = {
  emptyToNull,
  parsePositiveInt,
  normalizeCatalogSearchParams,
  buildBooleanQuery,
  buildOrderSql,
};
