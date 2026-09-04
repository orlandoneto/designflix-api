const {
  scoreCandidate,
  pickSimilar,
  buildSourceSignals,
  clampLimit,
  buildSearchQueryFromSource,
} = require('../../src/services/catalog/catalog-similar');

describe('catalog-similar', () => {
  const source = {
    id: 14,
    name: 'Flyer Academia Verão',
    format: 'PSD',
    availability: 'free',
    terms: 'flyer academia verao psd',
    count_download: 10,
    categories: [{ id: 3, name: 'Academia' }],
    tags: [{ id: 1, name: 'Flyer' }, { id: 2, name: 'Academia' }],
  };

  it('clampLimit respeita max', () => {
    expect(clampLimit(100)).toBe(40);
    expect(clampLimit(0)).toBe(12);
    expect(clampLimit(8)).toBe(8);
  });

  it('pontua mais quem compartilha categoria + tags + formato', () => {
    const signals = buildSourceSignals(source);
    const strong = scoreCandidate(signals, {
      id: 20,
      name: 'Pack Academia Flyer',
      format: 'PSD',
      availability: 'free',
      count_download: 50,
      categories: [{ id: 3, name: 'Academia' }],
      tags: [{ name: 'Flyer' }, { name: 'Academia' }],
      terms: 'pack academia flyer',
    });
    const weak = scoreCandidate(signals, {
      id: 21,
      name: 'Mockup Garrafa',
      format: 'PNG',
      availability: 'paid',
      count_download: 2,
      categories: [{ id: 9, name: 'Mockups' }],
      tags: [{ name: 'Mockup' }],
      terms: 'mockup garrafa',
    });
    expect(strong).toBeGreaterThan(weak);
    expect(strong).toBeGreaterThan(50);
  });

  it('exclui o próprio id e ordena por relevância', () => {
    const picked = pickSimilar(
      source,
      [
        { id: 14, name: 'Self', format: 'PSD', categories: [{ id: 3 }], tags: [{ name: 'Flyer' }] },
        {
          id: 30,
          name: 'Flyer Academia Promo',
          format: 'PSD',
          count_download: 5,
          categories: [{ id: 3, name: 'Academia' }],
          tags: [{ name: 'Flyer' }],
          terms: 'flyer academia',
        },
        {
          id: 31,
          name: 'Vetor Flor',
          format: 'AI',
          categories: [{ id: 8, name: 'Vetores' }],
          tags: [{ name: 'Flor' }],
          terms: 'vetor flor',
        },
      ],
      5
    );
    expect(picked.map((p) => p.id)).not.toContain(14);
    expect(picked[0].id).toBe(30);
  });

  it('diversifica quase-duplicatas de nome', () => {
    const picked = pickSimilar(
      source,
      [
        {
          id: 1,
          name: 'WhatsApp Image flower A',
          format: 'PNG',
          categories: [{ id: 3, name: 'Academia' }],
          tags: [],
          terms: 'image flower',
          count_download: 1,
        },
        {
          id: 2,
          name: 'WhatsApp Image flower B',
          format: 'PNG',
          categories: [{ id: 3, name: 'Academia' }],
          tags: [],
          terms: 'image flower',
          count_download: 1,
        },
        {
          id: 3,
          name: 'Pack Academia Flyer PSD',
          format: 'PSD',
          categories: [{ id: 3, name: 'Academia' }],
          tags: [{ name: 'Flyer' }, { name: 'Academia' }],
          terms: 'pack academia flyer psd',
          count_download: 20,
        },
      ],
      3
    );
    expect(picked.some((p) => p.id === 3)).toBe(true);
    expect(picked.length).toBeLessThanOrEqual(3);
  });

  it('buildSearchQueryFromSource monta texto útil', () => {
    const q = buildSearchQueryFromSource(source);
    expect(q.toLowerCase()).toMatch(/academia|flyer/);
  });
});
