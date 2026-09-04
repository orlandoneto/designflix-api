const {
  redactCleanFileUrl,
  redactCleanFileUrlList,
} = require('../../src/services/catalog/public-catalog-item');

describe('public-catalog-item', () => {
  it('remove url limpa da listagem pública', () => {
    const item = {
      id: 1,
      url_thumb: 'thumb-wm.jpg',
      url_cover: 'cover-wm.jpg',
      url: 'clean.zip',
    };
    expect(redactCleanFileUrl(item).url).toBeNull();
    expect(redactCleanFileUrl(item).url_cover).toBe('cover-wm.jpg');
  });

  it('redactCleanFileUrlList aplica em array', () => {
    const list = redactCleanFileUrlList([
      { id: 1, url: 'a.zip' },
      { id: 2, url: 'b.zip' },
    ]);
    expect(list.every((i) => i.url === null)).toBe(true);
  });
});
