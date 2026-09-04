const TagGenerator = require('../../utils/tagGenerator');

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 40;
const CANDIDATE_POOL = 80;

/**
 * Sinais de similaridade no estilo stock profissional:
 * categorias + tags + formato + tokens do nome/termos + popularidade.
 * Diversifica para evitar grade de quase-duplicatas.
 */

function clampLimit(raw, fallback = DEFAULT_LIMIT) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return fallback;
  return Math.min(n, MAX_LIMIT);
}

function normalizeLabel(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function tagNamesFromItem(item) {
  const raw = Array.isArray(item?.tags) ? item.tags : [];
  return raw
    .map((t) => (typeof t === 'string' ? t : t?.name))
    .filter((name) => name && !TagGenerator.isFilenameDumpTag(name))
    .map(normalizeLabel)
    .filter(Boolean);
}

function categoryIdsFromItem(item) {
  const cats = Array.isArray(item?.categories) ? item.categories : [];
  return cats.map((c) => Number(c?.id)).filter((id) => Number.isInteger(id) && id > 0);
}

function extractTokens(...texts) {
  const set = new Set();
  for (const text of texts) {
    if (!text) continue;
    const words = String(text)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9à-ÿ\s]/gi, ' ')
      .split(/\s+/)
      .filter(Boolean);
    for (const w of words) {
      if (!TagGenerator.isJunkToken(w)) set.add(w);
    }
  }
  return set;
}

function buildSourceSignals(item) {
  const tags = tagNamesFromItem(item);
  const categoryIds = categoryIdsFromItem(item);
  const format = String(item?.format || '').trim().toUpperCase();
  const tokens = extractTokens(
    item?.name,
    item?.terms,
    tags.join(' '),
    (item?.categories || []).map((c) => c?.name).join(' ')
  );

  return {
    id: Number(item.id),
    format,
    availability: item?.availability || null,
    categoryIds: new Set(categoryIds),
    tags: new Set(tags),
    tokens,
  };
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter += 1;
  }
  return inter / (a.size + b.size - inter);
}

/**
 * Pontua um candidato em relação à fonte.
 * Score 0 = descartar (sem overlap útil).
 */
function scoreCandidate(source, candidate) {
  if (!candidate || Number(candidate.id) === source.id) return 0;

  let score = 0;

  const candCats = categoryIdsFromItem(candidate);
  const sharedCats = candCats.filter((id) => source.categoryIds.has(id)).length;
  score += sharedCats * 42;

  const candTags = tagNamesFromItem(candidate);
  const sharedTags = candTags.filter((t) => source.tags.has(t)).length;
  score += Math.min(sharedTags * 28, 84);

  const candFormat = String(candidate.format || '').trim().toUpperCase();
  if (source.format && candFormat && source.format === candFormat) {
    score += 32;
  }

  const candTokens = extractTokens(
    candidate.name,
    candidate.terms,
    candTags.join(' '),
    (candidate.categories || []).map((c) => c?.name).join(' ')
  );
  const sharedTokens = [...candTokens].filter((t) => source.tokens.has(t)).length;
  score += Math.min(sharedTokens * 14, 42);

  if (source.availability && candidate.availability === source.availability) {
    score += 4;
  }

  const downloads = Number(candidate.count_download) || 0;
  score += Math.min(Math.log10(downloads + 1) * 6, 12);

  // Quase-duplicata de nome (mesmo dump / batch) perde prioridade
  const nameOverlap = jaccard(source.tokens, candTokens);
  if (nameOverlap >= 0.85 && sharedCats > 0 && sharedTags === 0 && sharedTokens <= 2) {
    score *= 0.35;
  }

  return score;
}

/**
 * Ordena por score e diversifica (evita grade de clones).
 */
function pickSimilar(sourceItem, candidates, limit = DEFAULT_LIMIT) {
  const source = buildSourceSignals(sourceItem);
  const capped = clampLimit(limit);

  const scored = (candidates || [])
    .map((item) => {
      const tokens = extractTokens(item?.name, item?.terms);
      return {
        item,
        score: scoreCandidate(source, item),
        tokens,
        primaryCat: categoryIdsFromItem(item)[0] || 0,
      };
    })
    .filter((row) => row.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (Number(b.item.count_download) || 0) - (Number(a.item.count_download) || 0)
    );

  const picked = [];
  const seenNearDup = [];
  const perCategory = new Map();

  for (const row of scored) {
    if (picked.length >= capped) break;

    const nearDup = seenNearDup.some((toks) => jaccard(toks, row.tokens) >= 0.8);
    if (nearDup && picked.length >= Math.min(3, capped)) continue;

    const cat = row.primaryCat;
    const catCount = perCategory.get(cat) || 0;
    // Evita encher a grade só com a mesma categoria se houver opções
    if (cat && catCount >= Math.max(4, Math.ceil(capped * 0.55)) && scored.length > capped) {
      continue;
    }

    picked.push(row.item);
    seenNearDup.push(row.tokens);
    if (cat) perCategory.set(cat, catCount + 1);
  }

  // Se diversificação ficou curta, completa com próximos scores
  if (picked.length < capped) {
    const pickedIds = new Set(picked.map((p) => p.id));
    for (const row of scored) {
      if (picked.length >= capped) break;
      if (pickedIds.has(row.item.id)) continue;
      picked.push(row.item);
      pickedIds.add(row.item.id);
    }
  }

  return picked;
}

function buildSearchQueryFromSource(item) {
  const tags = tagNamesFromItem(item).slice(0, 6);
  const cats = (item?.categories || [])
    .map((c) => c?.name)
    .filter(Boolean)
    .slice(0, 2);
  const nameTokens = [...extractTokens(item?.name)].slice(0, 4);
  const parts = [...cats, ...tags, ...nameTokens].filter(Boolean);
  return parts.join(' ').trim();
}

module.exports = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  CANDIDATE_POOL,
  clampLimit,
  buildSourceSignals,
  scoreCandidate,
  pickSimilar,
  buildSearchQueryFromSource,
  tagNamesFromItem,
  categoryIdsFromItem,
  extractTokens,
};
