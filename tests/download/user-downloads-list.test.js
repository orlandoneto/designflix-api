jest.mock('../../src/models', () => ({
  UserDownloads: {
    findAll: jest.fn(),
  },
  UserMainGrid: {},
  sequelize: {},
}));

jest.mock('../../src/utils/objectStorage', () => ({
  mapBrowserAssetUrls: (row) => row,
}));

jest.mock('../../src/services/user.service', () => ({}));
jest.mock('../../src/services/user-commissions.service', () => ({}));

const { UserDownloads } = require('../../src/models');
const UserDownloadsServices = require('../../src/services/user-downloads.services');
const { createMockRequest, createMockResponse } = require('../helpers/mockResponse');

describe('UserDownloadsServices.getUserDownloads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('200 lista enriquecida do próprio usuário', async () => {
    UserDownloads.findAll.mockResolvedValue([
      {
        toJSON: () => ({
          id: 3,
          user_main_grid_id: 16,
          total_downloads: 2,
          updatedAt: '2026-01-02T00:00:00.000Z',
          user_main_grid: {
            id: 16,
            name: 'Pack',
            format: 'PSD',
            availability: 'free',
            url_thumb: 'https://cdn/t.jpg',
            url_cover: null,
            url: 'https://cdn/clean.psd',
            count_download: 10,
          },
        }),
      },
    ]);
    const req = createMockRequest({ params: { userId: 7, user_id: '7' } });
    const res = createMockResponse();
    await UserDownloadsServices.getUserDownloads(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.data[0].item.url).toBeNull();
    expect(res.body.data[0].total_downloads).toBe(2);
  });

  it('400 se consultar outro usuário', async () => {
    const req = createMockRequest({ params: { userId: 7, user_id: '9' } });
    const res = createMockResponse();
    await UserDownloadsServices.getUserDownloads(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(UserDownloads.findAll).not.toHaveBeenCalled();
  });
});
