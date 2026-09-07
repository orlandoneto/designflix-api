jest.mock('../../src/models', () => ({
  UserLikes: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

const { UserLikes } = require('../../src/models');
const UserLikesServices = require('../../src/services/likes.services');
const { createMockRequest, createMockResponse } = require('../helpers/mockResponse');

describe('UserLikesServices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET 200 liked false quando não existe', async () => {
    UserLikes.findOne.mockResolvedValue(null);
    const req = createMockRequest({
      params: { user_id: '1', user_main_grid_id: '16' },
    });
    const res = createMockResponse();
    await UserLikesServices.getById(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.data.liked).toBe(false);
  });

  it('GET 200 liked true quando existe', async () => {
    UserLikes.findOne.mockResolvedValue({ id: 3, user_id: 1, user_main_grid_id: 16 });
    const req = createMockRequest({
      params: { user_id: '1', user_main_grid_id: '16' },
    });
    const res = createMockResponse();
    await UserLikesServices.getById(req, res);
    expect(res.body.data.liked).toBe(true);
  });

  it('POST 200 cria curtida', async () => {
    UserLikes.findOne.mockResolvedValue(null);
    UserLikes.create.mockResolvedValue({ id: 1, user_id: 7, user_main_grid_id: 16 });
    const req = createMockRequest({
      body: { user_id: 7, user_main_grid_id: 16 },
      params: { userId: '7' },
    });
    const res = createMockResponse();
    await UserLikesServices.create(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(UserLikes.create).toHaveBeenCalled();
    expect(res.body.message).toMatch(/curtida/i);
  });

  it('DELETE 200 remove curtida', async () => {
    const destroy = jest.fn().mockResolvedValue(undefined);
    UserLikes.findOne.mockResolvedValue({ destroy });
    const req = createMockRequest({
      params: { user_id: '7', user_main_grid_id: '16' },
    });
    const res = createMockResponse();
    await UserLikesServices.delete(req, res);
    expect(destroy).toHaveBeenCalled();
    expect(res.body.data.removed).toBe(true);
  });
});
