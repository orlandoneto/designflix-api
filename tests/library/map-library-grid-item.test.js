jest.mock('../../src/utils/objectStorage', () => ({
  mapBrowserAssetUrls: (row) => row,
}));

const { mapLibraryGridItem } = require('../../src/services/library/map-library-grid-item');

describe('mapLibraryGridItem', () => {
  it('mapeia campos e redige url limpa', () => {
    const item = mapLibraryGridItem({
      id: 16,
      name: 'Pack',
      format: 'PSD',
      availability: 'paid',
      url_thumb: 'https://cdn/t.jpg',
      url_cover: 'https://cdn/c.jpg',
      url: 'https://cdn/clean.psd',
      count_download: 9,
    });
    expect(item).toEqual({
      id: 16,
      name: 'Pack',
      format: 'PSD',
      availability: 'paid',
      url_thumb: 'https://cdn/t.jpg',
      url_cover: 'https://cdn/c.jpg',
      url: null,
      count_download: 9,
    });
  });

  it('null quando grid ausente', () => {
    expect(mapLibraryGridItem(null)).toBeNull();
  });
});
