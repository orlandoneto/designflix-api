jest.mock('../../src/models', () => {
  const Sequelize = {
    fn: jest.fn((name, col) => ({ fn: name, col })),
    col: jest.fn((name) => name),
    literal: jest.fn((sql) => ({ literal: sql })),
    Op: { gte: Symbol('gte') },
  };

  return {
    Sequelize,
    User: { findOne: jest.fn() },
    UserCommission: {
      findOne: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
    },
  };
});

const { User, UserCommission } = require('../../src/models');
const UserCommissionsServices = require('../../src/services/user-commissions.service');
const { createMockRequest, createMockResponse } = require('../helpers/mockResponse');

/**
 * `commissionsUserById` faz 4 findOne (hoje, 7d, 30d, total) e 1 findAll.
 * O helper responde na ordem em que são disparados.
 */
function mockPeriods({ today, last7, last30, total }) {
  UserCommission.findOne
    .mockResolvedValueOnce(today)
    .mockResolvedValueOnce(last7)
    .mockResolvedValueOnce(last30)
    .mockResolvedValueOnce(total);
}

describe('UserCommissionsServices.commissionsUserById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('200 com envelope e períodos como objeto', async () => {
    User.findOne.mockResolvedValue({ balance: 12.6 });
    mockPeriods({
      today: { total: '0.60', downloads: '2' },
      last7: { total: '3.00', downloads: '10' },
      last30: { total: '12.60', downloads: '42' },
      total: { total: '12.60' },
    });
    UserCommission.findAll.mockResolvedValue([{ amount: '0.30' }]);

    const req = createMockRequest({ params: { userId: '7' } });
    const res = createMockResponse();
    await UserCommissionsServices.commissionsUserById(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.today).toEqual({ total: 0.6, downloads: 2 });
    expect(res.body.data.totalGeneral).toBe(12.6);
  });

  it('saldo abaixo de R$ 100 não é sacável mas continua visível', async () => {
    User.findOne.mockResolvedValue({ balance: 12.6 });
    mockPeriods({
      today: { total: null, downloads: 0 },
      last7: { total: null, downloads: 0 },
      last30: { total: '12.60', downloads: '42' },
      total: { total: '12.60' },
    });
    UserCommission.findAll.mockResolvedValue([]);

    const req = createMockRequest({ params: { userId: 7 } });
    const res = createMockResponse();
    await UserCommissionsServices.commissionsUserById(req, res);

    expect(res.body.data.balance).toBe(12.6);
    expect(res.body.data.availableBalance).toBe(0);
    expect(res.body.data.canRequestPayout).toBe(false);
    expect(res.body.data.missingForPayout).toBe(87.4);
  });

  it('saldo acima do mínimo libera o saque', async () => {
    User.findOne.mockResolvedValue({ balance: 150 });
    mockPeriods({
      today: { total: null, downloads: 0 },
      last7: { total: null, downloads: 0 },
      last30: { total: '150.00', downloads: '500' },
      total: { total: '150.00' },
    });
    UserCommission.findAll.mockResolvedValue([]);

    const req = createMockRequest({ params: { userId: 7 } });
    const res = createMockResponse();
    await UserCommissionsServices.commissionsUserById(req, res);

    expect(res.body.data.availableBalance).toBe(150);
    expect(res.body.data.canRequestPayout).toBe(true);
    expect(res.body.data.missingForPayout).toBe(0);
  });

  it('colaborador sem comissão nenhuma responde 200 zerado', async () => {
    User.findOne.mockResolvedValue({ balance: null });
    mockPeriods({
      today: { total: null, downloads: 0 },
      last7: { total: null, downloads: 0 },
      last30: { total: null, downloads: 0 },
      total: { total: null },
    });
    UserCommission.findAll.mockResolvedValue([]);

    const req = createMockRequest({ params: { userId: 7 } });
    const res = createMockResponse();
    await UserCommissionsServices.commissionsUserById(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.data.balance).toBe(0);
    expect(res.body.data.totalGeneral).toBe(0);
    expect(res.body.data.commissionsLast30DaysCount).toBe(0);
  });

  it('400 quando userId é inválido', async () => {
    const req = createMockRequest({ params: { userId: 'abc' } });
    const res = createMockResponse();
    await UserCommissionsServices.commissionsUserById(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({ success: false, message: 'Usuário inválido' });
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it('404 quando usuário não existe', async () => {
    User.findOne.mockResolvedValue(null);

    const req = createMockRequest({ params: { userId: 999 } });
    const res = createMockResponse();
    await UserCommissionsServices.commissionsUserById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body.success).toBe(false);
  });

  it('500 não vaza detalhe técnico do erro', async () => {
    User.findOne.mockRejectedValue(new Error('ER_NO_SUCH_TABLE: user_commissions'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const req = createMockRequest({ params: { userId: 7 } });
    const res = createMockResponse();
    await UserCommissionsServices.commissionsUserById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.body.message).toBe('Erro ao buscar comissões');
    expect(JSON.stringify(res.body)).not.toContain('ER_NO_SUCH_TABLE');
  });
});

describe('UserCommissionsServices._createCommission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('grava R$ 0,30 como pending para o colaborador', async () => {
    UserCommission.create.mockResolvedValue({ id: 1 });

    const result = await UserCommissionsServices._createCommission(9, {
      downloaderUserId: 5,
    });

    expect(result.success).toBe(true);
    expect(UserCommission.create).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 9, amount: 0.3, status: 'pending' })
    );
  });

  it('auto-download não grava comissão', async () => {
    const result = await UserCommissionsServices._createCommission(9, {
      downloaderUserId: 9,
    });

    expect(result.skipped).toBe(true);
    expect(UserCommission.create).not.toHaveBeenCalled();
  });

  it('criação manual (sem downloader) segue funcionando', async () => {
    UserCommission.create.mockResolvedValue({ id: 2 });

    const result = await UserCommissionsServices._createCommission(9);

    expect(result.success).toBe(true);
    expect(UserCommission.create).toHaveBeenCalled();
  });
});
