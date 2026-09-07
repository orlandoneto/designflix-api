jest.mock('../../src/models', () => ({
  UserFavorites: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  },
  UserMainGrid: {},
}));

jest.mock('../../src/utils/objectStorage', () => ({
  mapBrowserAssetUrls: (row) => row,
}));

const { UserFavorites } = require('../../src/models');
const UserFavoritesServices = require('../../src/services/favorites.services');
const { createMockRequest, createMockResponse } = require('../helpers/mockResponse');

describe('UserFavoritesServices.getAll', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('200 lista enriquecida só do usuário autenticado', async () => {
    UserFavorites.findAll.mockResolvedValue([
      {
        toJSON: () => ({
          id: 1,
          user_id: 7,
          user_main_grid_id: 16,
          createdAt: '2026-01-01T00:00:00.000Z',
          user_main_grid: {
            id: 16,
            name: 'Pack',
            format: 'PSD',
            availability: 'paid',
            url_thumb: 'https://cdn/t.jpg',
            url_cover: null,
            url: 'https://cdn/clean.psd',
            count_download: 2,
          },
        }),
      },
    ]);
    const req = createMockRequest({ params: { userId: 7 } });
    const res = createMockResponse();
    await UserFavoritesServices.getAll(req, res);
    expect(UserFavorites.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { user_id: 7 } })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.meta.count).toBe(1);
    expect(res.body.data[0].item.id).toBe(16);
    expect(res.body.data[0].item.url).toBeNull();
  });

  it('400 sem userId', async () => {
    const req = createMockRequest({ params: {} });
    const res = createMockResponse();
    await UserFavoritesServices.getAll(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('UserFavoritesServices.getById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('200 favorited false quando não existe (não 404)', async () => {
    UserFavorites.findOne.mockResolvedValue(null);
    const req = createMockRequest({
      params: { user_id: '1', user_main_grid_id: '16' },
    });
    const res = createMockResponse();

    await UserFavoritesServices.getById(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.favorited).toBe(false);
    expect(res.body.data.favorite).toBeNull();
  });

  it('200 favorited true quando existe', async () => {
    UserFavorites.findOne.mockResolvedValue({
      id: 9,
      user_id: 1,
      user_main_grid_id: 16,
    });
    const req = createMockRequest({
      params: { user_id: '1', user_main_grid_id: '16' },
    });
    const res = createMockResponse();

    await UserFavoritesServices.getById(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.data.favorited).toBe(true);
    expect(res.body.data.favorite.id).toBe(9);
  });

  it('400 se ids inválidos', async () => {
    const req = createMockRequest({
      params: { user_id: 'x', user_main_grid_id: '0' },
    });
    const res = createMockResponse();
    await UserFavoritesServices.getById(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.success).toBe(false);
  });
});
