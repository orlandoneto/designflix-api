const {
  getStorageDriver,
  isR2Mode,
  buildPublicObjectUrl,
  putObjectParams,
  getR2Endpoint,
  getCredentials,
  getBucketName,
  guessContentType,
  rewriteBrowserAssetUrl,
} = require('../../src/utils/objectStorage');

describe('objectStorage', () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it('detecta r2 via STORAGE_TYPE', () => {
    process.env.STORAGE_TYPE = 'r2';
    delete process.env.STORAGE_DRIVER;
    expect(getStorageDriver()).toBe('r2');
    expect(isR2Mode()).toBe(true);
  });

  it('detecta local e tem prioridade sobre r2', () => {
    process.env.STORAGE_TYPE = 'local';
    expect(getStorageDriver()).toBe('local');
  });

  it('usa credenciais R2_* quando em modo r2', () => {
    process.env.STORAGE_TYPE = 'r2';
    process.env.R2_ACCESS_KEY_ID = 'r2-key';
    process.env.R2_SECRET_ACCESS_KEY = 'r2-secret';
    process.env.AWS_ACCESS_KEY_ID = 'aws-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'aws-secret';
    expect(getCredentials()).toEqual({
      accessKeyId: 'r2-key',
      secretAccessKey: 'r2-secret',
    });
  });

  it('monta URL pública R2 com R2_PUBLIC_URL', () => {
    process.env.STORAGE_TYPE = 'r2';
    process.env.R2_PUBLIC_URL = 'https://cdn.example.com';
    expect(buildPublicObjectUrl('images/a.webp')).toBe(
      'https://cdn.example.com/images/a.webp'
    );
  });

  it('sem R2_PUBLIC_URL usa proxy /storage da API', () => {
    process.env.STORAGE_TYPE = 'r2';
    delete process.env.R2_PUBLIC_URL;
    delete process.env.CDN_PUBLIC_URL;
    process.env.LOCAL_STORAGE_PUBLIC_URL = 'http://localhost:3000';
    expect(buildPublicObjectUrl('thumbs_test/a.webp')).toBe(
      'http://localhost:3000/storage/thumbs_test/a.webp'
    );
  });

  it('rewriteBrowserAssetUrl converte endpoint privado R2', () => {
    process.env.STORAGE_TYPE = 'r2';
    process.env.R2_BUCKET_NAME = 'new-design-storage';
    process.env.R2_ACCOUNT_ID = 'abc';
    delete process.env.R2_PUBLIC_URL;
    process.env.LOCAL_STORAGE_PUBLIC_URL = 'http://localhost:3000';
    const privateUrl =
      'https://abc.r2.cloudflarestorage.com/new-design-storage/thumbs_test/x.webp';
    expect(rewriteBrowserAssetUrl(privateUrl)).toBe(
      'http://localhost:3000/storage/thumbs_test/x.webp'
    );
  });

  it('rewriteBrowserAssetUrl reescreve uploads localhost quando base pública é externa', () => {
    process.env.LOCAL_STORAGE_PUBLIC_URL =
      'https://4249-example.ngrok-free.app';
    const localThumb =
      'http://localhost:3000/uploads/thumbs_test/x.webp';
    expect(rewriteBrowserAssetUrl(localThumb)).toBe(
      'https://4249-example.ngrok-free.app/uploads/thumbs_test/x.webp'
    );
  });

  it('rewriteBrowserAssetUrl mantém localhost quando base pública também é local', () => {
    process.env.LOCAL_STORAGE_PUBLIC_URL = 'http://localhost:3000';
    const localThumb =
      'http://localhost:3000/uploads/thumbs_test/x.webp';
    expect(rewriteBrowserAssetUrl(localThumb)).toBe(localThumb);
  });

  it('mapBrowserAssetUrls reescreve photo aninhada em user', () => {
    const { mapBrowserAssetUrls } = require('../../src/utils/objectStorage');
    process.env.STORAGE_TYPE = 'r2';
    process.env.R2_BUCKET_NAME = 'new-design-storage';
    process.env.R2_ACCOUNT_ID = 'abc';
    delete process.env.R2_PUBLIC_URL;
    process.env.LOCAL_STORAGE_PUBLIC_URL = 'http://localhost:3000';
    const mapped = mapBrowserAssetUrls({
      id: 1,
      url_cover: null,
      user: {
        id: 2,
        photo:
          'https://abc.r2.cloudflarestorage.com/new-design-storage/avatars/a.webp',
      },
    });
    expect(mapped.user.photo).toBe(
      'http://localhost:3000/storage/avatars/a.webp'
    );
  });

  it('guessContentType detecta jpeg/webp', () => {
    expect(guessContentType('a.jpeg')).toBe('image/jpeg');
    expect(guessContentType('b.webp')).toBe('image/webp');
    expect(guessContentType('c.zip')).toBe('application/zip');
  });

  it('putObjectParams omite ACL no R2', () => {
    process.env.STORAGE_TYPE = 'r2';
    process.env.R2_BUCKET_NAME = 'new-design-storage';
    const params = putObjectParams({
      Key: 'x.webp',
      Body: Buffer.from('x'),
      ContentType: 'image/webp',
    });
    expect(params.ACL).toBeUndefined();
    expect(params.Bucket).toBe('new-design-storage');
  });

  it('monta endpoint a partir do Account ID', () => {
    process.env.STORAGE_TYPE = 'r2';
    delete process.env.R2_ENDPOINT;
    process.env.R2_ACCOUNT_ID = 'abc123';
    expect(getR2Endpoint()).toBe(
      'https://abc123.r2.cloudflarestorage.com'
    );
  });

  it('getBucketName prefere R2_BUCKET_NAME', () => {
    process.env.STORAGE_TYPE = 'r2';
    process.env.R2_BUCKET_NAME = 'new-design-storage';
    process.env.AWS_BUCKET_NAME = 'designflix-storage';
    expect(getBucketName()).toBe('new-design-storage');
  });
});
