/**
 * Documento indexado no Meilisearch (read path do Explorer).
 */

function mapGridToCatalogDocument(plain) {
  const categories = plain.categories
    || (plain.user_main_grid_categories || []).map((row) => ({
      id: row.category?.id ?? row.category_id,
      name: row.category?.name,
      slug: row.category?.slug || null,
    }));

  const tags = plain.tags
    || (plain.user_main_grid_tags || []).map((row) => ({
      id: row.tag?.id ?? row.tag_id,
      name: row.tag?.name,
    }));

  const primary = categories[0] || null;
  const format = String(plain.format || '').toUpperCase();
  const availability = String(plain.availability || 'paid').toLowerCase() === 'free'
    ? 'free'
    : 'paid';

  return {
    id: Number(plain.id),
    name: plain.name || '',
    terms: plain.terms || '',
    format,
    availability,
    url_thumb: plain.url_thumb || null,
    url_cover: plain.url_cover || null,
    url: plain.url || null,
    count_download: Number(plain.count_download || 0),
    category_ids: categories.map((c) => Number(c.id)).filter(Boolean),
    category_slugs: categories.map((c) => c.slug).filter(Boolean),
    category_names: categories.map((c) => c.name).filter(Boolean),
    primary_category_id: primary?.id ? Number(primary.id) : null,
    primary_category_slug: primary?.slug || null,
    tags: tags.map((t) => t.name).filter(Boolean),
    created_at: plain.created_at || plain.createdAt
      ? new Date(plain.created_at || plain.createdAt).getTime()
      : Date.now(),
    activite: Number(plain.activite ?? 0),
  };
}

const PT_SYNONYMS = {
  academia: ['gym', 'fitness', 'treino'],
  gym: ['academia', 'fitness'],
  flyer: ['panfleto', 'folheto'],
  panfleto: ['flyer', 'folheto'],
  mockup: ['mock-up', 'maquete'],
  vetor: ['vector', 'svg'],
  vector: ['vetor', 'svg'],
};

module.exports = {
  mapGridToCatalogDocument,
  PT_SYNONYMS,
};
