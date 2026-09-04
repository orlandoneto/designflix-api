const { mapGridToCatalogDocument, PT_SYNONYMS } = require('../../src/services/catalog/catalog-document');
const { buildMeiliFilter, mapHit } = require('../../src/services/catalog/meilisearch-search-provider');

describe('catalog-document', () => {
  it('mapeia registro do grid para documento Meili', () => {
    const doc = mapGridToCatalogDocument({
      id: 10,
      name: 'Mockup Academia',
      format: 'psd',
      availability: 'paid',
      terms: 'mockup academia',
      count_download: 5,
      url_thumb: 'a.jpg',
      categories: [{ id: 2, name: 'Academia', slug: 'academia' }],
      tags: [{ id: 1, name: 'fitness' }],
      created_at: '2026-01-01T00:00:00.000Z',
    });

    expect(doc.id).toBe(10);
    expect(doc.format).toBe('PSD');
    expect(doc.availability).toBe('paid');
    expect(doc.category_slugs).toEqual(['academia']);
    expect(doc.tags).toEqual(['fitness']);
    expect(doc.activite).toBe(0);
  });

  it('tem sinônimos PT-BR básicos', () => {
    expect(PT_SYNONYMS.academia).toContain('gym');
    expect(PT_SYNONYMS.flyer).toContain('panfleto');
  });
});

describe('meilisearch-search-provider helpers', () => {
  it('buildMeiliFilter monta filtros', () => {
    const f = buildMeiliFilter(
      { format: 'PSD', availability: 'free', categorySlug: null },
      3
    );
    expect(f).toContain('activite = 0');
    expect(f).toContain('format = "PSD"');
    expect(f).toContain('availability = "free"');
    expect(f).toContain('category_ids = 3');
  });

  it('buildMeiliFilter trata JPEG como JPG', () => {
    const f = buildMeiliFilter({ format: 'JPEG', categorySlug: null }, null);
    expect(f).toContain('format = "JPG" OR format = "JPEG"');
  });

  it('mapHit normaliza hit', () => {
    const item = mapHit({
      id: 1,
      name: 'X',
      format: 'PNG',
      availability: 'free',
      category_names: ['Food'],
      category_ids: [9],
      category_slugs: ['delivery'],
    });
    expect(item.categories[0]).toEqual({ id: 9, name: 'Food', slug: 'delivery' });
  });
});
