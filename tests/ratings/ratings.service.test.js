jest.mock('../../src/models', () => ({
  UserFileRatings: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
  UserMainGrid: {
    findOne: jest.fn(),
  },
  sequelize: {
    fn: jest.fn((name, col) => ({ fn: name, col })),
    col: jest.fn((name) => name),
  },
}));

const { UserFileRatings, UserMainGrid } = require('../../src/models');
const RatingsService = require('../../src/services/ratings.service');
const { createMockRequest, createMockResponse } = require('../helpers/mockResponse');

describe('RatingsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseScore / roundAverage', () => {
    it('aceita score 1–5', () => {
      expect(RatingsService.parseScore(3)).toBe(3);
      expect(RatingsService.parseScore('5')).toBe(5);
      expect(RatingsService.parseScore(0)).toBeNull();
      expect(RatingsService.parseScore(6)).toBeNull();
      expect(RatingsService.parseScore(3.5)).toBeNull();
    });

    it('arredonda média para 1 casa', () => {
      expect(RatingsService.roundAverage(4.94)).toBe(4.9);
      expect(RatingsService.roundAverage(4.95)).toBe(5);
      expect(RatingsService.roundAverage(null)).toBe(0);
    });
  });

  describe('upsert', () => {
    it('400 se score inválido', async () => {
      const req = createMockRequest({
        params: { userId: '1' },
        body: { user_main_grid_id: 16, score: 9 },
      });
      const res = createMockResponse();
      await RatingsService.upsert(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body.success).toBe(false);
    });

    it('404 se arquivo não existe', async () => {
      UserMainGrid.findOne.mockResolvedValue(null);
      const req = createMockRequest({
        params: { userId: '1' },
        body: { user_main_grid_id: 99, score: 4 },
      });
      const res = createMockResponse();
      await RatingsService.upsert(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.body.success).toBe(false);
    });

    it('200 cria avaliação e devolve média', async () => {
      UserMainGrid.findOne.mockResolvedValue({ id: 16 });
      UserFileRatings.findOne
        .mockResolvedValueOnce(null) // existing rating
        .mockResolvedValueOnce({ average_rating: 4, ratings_count: 1 }); // summary
      UserFileRatings.create.mockResolvedValue({ id: 7, score: 4 });

      const req = createMockRequest({
        params: { userId: '3' },
        body: { user_main_grid_id: 16, score: 4 },
      });
      const res = createMockResponse();
      await RatingsService.upsert(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.score).toBe(4);
      expect(res.body.data.average_rating).toBe(4);
      expect(res.body.data.ratings_count).toBe(1);
      expect(UserFileRatings.create).toHaveBeenCalledWith({
        user_id: 3,
        user_main_grid_id: 16,
        score: 4,
      });
    });

    it('200 atualiza avaliação existente', async () => {
      const existing = {
        id: 7,
        score: 3,
        update: jest.fn().mockResolvedValue(undefined),
      };
      UserMainGrid.findOne.mockResolvedValue({ id: 16 });
      UserFileRatings.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ average_rating: 5, ratings_count: 2 });
      existing.update.mockImplementation(async ({ score }) => {
        existing.score = score;
      });

      const req = createMockRequest({
        params: { userId: '3' },
        body: { user_main_grid_id: 16, score: 5 },
      });
      const res = createMockResponse();
      await RatingsService.upsert(req, res);

      expect(existing.update).toHaveBeenCalledWith({ score: 5 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.body.message).toMatch(/atualizada/i);
      expect(res.body.data.score).toBe(5);
      expect(res.body.data.average_rating).toBe(5);
    });
  });

  describe('getMine', () => {
    it('200 my_rating null quando não avaliou', async () => {
      UserFileRatings.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ average_rating: 4.5, ratings_count: 10 });

      const req = createMockRequest({
        params: { userId: '1', user_main_grid_id: '16' },
      });
      const res = createMockResponse();
      await RatingsService.getMine(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.body.data.my_rating).toBeNull();
      expect(res.body.data.average_rating).toBe(4.5);
      expect(res.body.data.ratings_count).toBe(10);
    });

    it('200 my_rating quando existe', async () => {
      UserFileRatings.findOne
        .mockResolvedValueOnce({ score: 5 })
        .mockResolvedValueOnce({ average_rating: 4.9, ratings_count: 12 });

      const req = createMockRequest({
        params: { userId: '1', user_main_grid_id: '16' },
      });
      const res = createMockResponse();
      await RatingsService.getMine(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.body.data.my_rating).toBe(5);
      expect(res.body.success).toBe(true);
    });

    it('400 se ids inválidos', async () => {
      const req = createMockRequest({
        params: { userId: 'x', user_main_grid_id: '0' },
      });
      const res = createMockResponse();
      await RatingsService.getMine(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body.success).toBe(false);
    });
  });
});
