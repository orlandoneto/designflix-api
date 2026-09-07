jest.mock('../../src/models', () => ({
  UserDownloads: {
    findAll: jest.fn(),
  },
  UserFavorites: {
    count: jest.fn(),
  },
}));

const { UserDownloads, UserFavorites } = require('../../src/models');
const AccountStatsServices = require('../../src/services/account-stats.service');
const { createMockRequest, createMockResponse } = require('../helpers/mockResponse');

describe('AccountStatsServices.getMine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('200 com downloads (soma) e saved', async () => {
    UserDownloads.findAll.mockResolvedValue([
      { total_downloads: 3 },
      { total_downloads: 2 },
    ]);
    UserFavorites.count.mockResolvedValue(4);

    const req = createMockRequest({ params: { userId: 7 } });
    const res = createMockResponse();
    await AccountStatsServices.getMine(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({ downloads: 5, saved: 4 });
    expect(UserFavorites.count).toHaveBeenCalledWith({ where: { user_id: 7 } });
  });

  it('200 com zeros quando vazio', async () => {
    UserDownloads.findAll.mockResolvedValue([]);
    UserFavorites.count.mockResolvedValue(0);
    const req = createMockRequest({ params: { userId: 1 } });
    const res = createMockResponse();
    await AccountStatsServices.getMine(req, res);
    expect(res.body.data).toEqual({ downloads: 0, saved: 0 });
  });

  it('400 se userId ausente', async () => {
    const req = createMockRequest({ params: {} });
    const res = createMockResponse();
    await AccountStatsServices.getMine(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.success).toBe(false);
  });
});
