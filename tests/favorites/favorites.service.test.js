jest.mock('../../src/models', () => ({
  UserFavorites: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  },
}));

const { UserFavorites } = require('../../src/models');
const UserFavoritesServices = require('../../src/services/favorites.services');
const { createMockRequest, createMockResponse } = require('../helpers/mockResponse');

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
