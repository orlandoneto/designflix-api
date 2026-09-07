const {
  resolvePersistedImageMeta,
} = require('../../src/services/upload/upload-image-meta');

describe('resolvePersistedImageMeta', () => {
  it('extrai width/height do imageMetadata e prefere contentSize', () => {
    expect(
      resolvePersistedImageMeta({
        imageMetadata: { width: 1200, height: 800, format: 'JPG' },
        contentSize: 50000,
        previewSize: 1000,
      })
    ).toEqual({ width: 1200, height: 800, file_size: 50000 });
  });

  it('usa previewSize quando não há contentSize', () => {
    expect(
      resolvePersistedImageMeta({
        imageMetadata: { width: 100, height: 50 },
        previewSize: 999,
      })
    ).toEqual({ width: 100, height: 50, file_size: 999 });
  });

  it('devolve nulls se metadata ausente ou inválida', () => {
    expect(resolvePersistedImageMeta({})).toEqual({
      width: null,
      height: null,
      file_size: null,
    });
    expect(
      resolvePersistedImageMeta({ imageMetadata: { width: 0, height: -1 } })
    ).toEqual({ width: null, height: null, file_size: null });
  });
});
