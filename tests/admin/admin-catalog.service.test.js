jest.mock('../../src/models', () => ({
  UserMainGrid: {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    destroy: jest.fn(),
  },
  User: {},
  UserFavorites: { destroy: jest.fn() },
  UserLikes: { destroy: jest.fn() },
  UserDownloads: { destroy: jest.fn() },
  UserFileRatings: { destroy: jest.fn() },
}));

jest.mock('../../src/services/catalog/catalog-sync', () => ({
  syncCatalogDocument: jest.fn(),
  removeCatalogDocument: jest.fn(),
}));

jest.mock('../../src/utils/objectStorage', () => ({
  createObjectStorageClient: jest.fn(() => ({ send: jest.fn() })),
  getBucketName: jest.fn(() => 'bucket'),
  extractObjectKeyFromUrl: jest.fn((url) => {
    if (!url) throw new Error('empty');
    return String(url).replace(/^.*\//, '');
  }),
  rewriteBrowserAssetUrl: jest.fn((u) => u),
  assertObjectStorageConfigured: jest.fn(),
}));

jest.mock('../../src/utils/redisCache', () => ({
  removePatternFromCache: jest.fn(),
}));

const AdminCatalogService = require('../../src/services/admin-catalog.service');
const {
  UserMainGrid,
  UserFavorites,
  UserLikes,
  UserDownloads,
  UserFileRatings,
} = require('../../src/models');
const {
  syncCatalogDocument,
  removeCatalogDocument,
} = require('../../src/services/catalog/catalog-sync');
const {
  createObjectStorageClient,
  assertObjectStorageConfigured,
} = require('../../src/utils/objectStorage');
const {
  createMockRequest,
  createMockResponse,
} = require('../helpers/mockResponse');

const gridRow = (overrides = {}) => ({
  id: 10,
  name: 'Pack Teste',
  format: 'psd',
  availability: 'paid',
  activite: false,
  url_thumb: 'https://cdn.example/thumbs/a.webp',
  url_cover: 'https://cdn.example/preview/a.webp',
  url: 'https://cdn.example/downloads/a.zip',
  user_id: 3,
  createdAt: '2026-09-01T12:00:00.000Z',
  user: { id: 3, name: 'Ana', email: 'ana@ex.com' },
  get({ plain }) {
    if (plain) {
      return {
        id: this.id,
        name: this.name,
        format: this.format,
        availability: this.availability,
        activite: this.activite,
        url_thumb: this.url_thumb,
        url_cover: this.url_cover,
        url: this.url,
        user_id: this.user_id,
        createdAt: this.createdAt,
        user: this.user,
      };
    }
    return this;
  },
  update: jest.fn(async function update(payload) {
    Object.assign(this, payload);
    return this;
  }),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  UserFavorites.destroy.mockResolvedValue(1);
  UserLikes.destroy.mockResolvedValue(1);
  UserDownloads.destroy.mockResolvedValue(1);
  UserFileRatings.destroy.mockResolvedValue(1);
  UserMainGrid.destroy.mockResolvedValue(1);
  syncCatalogDocument.mockResolvedValue(undefined);
  removeCatalogDocument.mockResolvedValue(undefined);
});

describe('GET /admin/catalog list', () => {
  it('lista com envelope 200 e pagination', async () => {
    UserMainGrid.findAndCountAll.mockResolvedValue({
      rows: [gridRow()],
      count: 1,
    });
    const res = createMockResponse();

    await AdminCatalogService.list(
      createMockRequest({ query: { page: '1', limit: '24', status: 'all' } }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].disabled).toBe(false);
    expect(res.body.data[0].contributor.email).toBe('ana@ex.com');
    expect(res.body.pagination.total).toBe(1);
  });

  it('400 para status inválido', async () => {
    const res = createMockResponse();
    await AdminCatalogService.list(
      createMockRequest({ query: { status: 'xyz' } }),
      res
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('lista vazia continua 200', async () => {
    UserMainGrid.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
    const res = createMockResponse();
    await AdminCatalogService.list(createMockRequest({ query: {} }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

describe('PATCH /admin/catalog/:id', () => {
  it('desabilita e sincroniza Meili', async () => {
    const row = gridRow();
    UserMainGrid.findByPk.mockResolvedValue(row);
    const res = createMockResponse();

    await AdminCatalogService.setDisabled(
      createMockRequest({ params: { id: '10' }, body: { disabled: true } }),
      res
    );

    expect(row.update).toHaveBeenCalledWith({ activite: true });
    expect(syncCatalogDocument).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.body.data.disabled).toBe(true);
  });

  it('400 sem disabled boolean', async () => {
    const res = createMockResponse();
    await AdminCatalogService.setDisabled(
      createMockRequest({ params: { id: '10' }, body: {} }),
      res
    );
    expect(res.statusCode).toBe(400);
  });

  it('404 quando não existe', async () => {
    UserMainGrid.findByPk.mockResolvedValue(null);
    const res = createMockResponse();
    await AdminCatalogService.setDisabled(
      createMockRequest({ params: { id: '99' }, body: { disabled: false } }),
      res
    );
    expect(res.statusCode).toBe(404);
  });
});

describe('DELETE /admin/catalog/:id', () => {
  it('remove R2, orphans, DB e Meili', async () => {
    const send = jest.fn().mockResolvedValue({});
    createObjectStorageClient.mockReturnValue({ send });
    UserMainGrid.findByPk.mockResolvedValue(gridRow());
    const res = createMockResponse();

    await AdminCatalogService.remove(
      createMockRequest({ params: { id: '10' } }),
      res
    );

    expect(assertObjectStorageConfigured).toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(3);
    expect(UserFavorites.destroy).toHaveBeenCalled();
    expect(UserMainGrid.destroy).toHaveBeenCalledWith({ where: { id: 10 } });
    expect(removeCatalogDocument).toHaveBeenCalledWith(10);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.id).toBe(10);
  });

  it('404 quando não existe', async () => {
    UserMainGrid.findByPk.mockResolvedValue(null);
    const res = createMockResponse();
    await AdminCatalogService.remove(
      createMockRequest({ params: { id: '99' } }),
      res
    );
    expect(res.statusCode).toBe(404);
  });

  it('400 para id inválido', async () => {
    const res = createMockResponse();
    await AdminCatalogService.remove(
      createMockRequest({ params: { id: 'abc' } }),
      res
    );
    expect(res.statusCode).toBe(400);
  });
});
