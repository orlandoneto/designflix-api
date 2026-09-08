jest.mock('../../src/models', () => ({
  Plans: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
  UserPlans: {
    count: jest.fn(),
  },
}));

const AdminPlansService = require('../../src/services/admin-plans.service');
const { Plans, UserPlans } = require('../../src/models');
const {
  createMockRequest,
  createMockResponse,
} = require('../helpers/mockResponse');

const planRow = (overrides = {}) => ({
  id: 5,
  plan_name: 'pro_mensal',
  display_name: 'Pro',
  tier: 'pro',
  price_cents: 2900,
  currency: 'BRL',
  billing_interval: 'month',
  count_downloads: 0,
  features: ['Ilimitado'],
  sort_order: 1,
  active: true,
  gateway: 'asaas',
  stripe_price_id: null,
  update: jest.fn(async function update(payload) {
    Object.assign(this, payload);
    return this;
  }),
  destroy: jest.fn(),
  ...overrides,
});

const validBody = (overrides = {}) => ({
  plan_name: 'pro_mensal',
  display_name: 'Pro',
  tier: 'pro',
  price_cents: 2900,
  billing_interval: 'month',
  count_downloads: 0,
  features: ['Ilimitado'],
  sort_order: 1,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listAdmin / listPublic', () => {
  it('lista para o admin com envelope 200', async () => {
    Plans.findAll.mockResolvedValue([planRow()]);
    const res = createMockResponse();

    await AdminPlansService.listAdmin(createMockRequest(), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].gateway).toBe('asaas');
  });

  it('lista pública filtra por ativo e omite gateway', async () => {
    Plans.findAll.mockResolvedValue([planRow()]);
    const res = createMockResponse();

    await AdminPlansService.listPublic(createMockRequest(), res);

    expect(Plans.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { active: true } })
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.data[0]).not.toHaveProperty('gateway');
  });

  it('lista vazia continua 200', async () => {
    Plans.findAll.mockResolvedValue([]);
    const res = createMockResponse();

    await AdminPlansService.listPublic(createMockRequest(), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('erro do banco vira 500 sem vazar detalhe', async () => {
    Plans.findAll.mockRejectedValue(new Error('connection refused'));
    const res = createMockResponse();

    await AdminPlansService.listAdmin(createMockRequest(), res);

    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).not.toMatch(/connection refused/);
  });
});

describe('getById', () => {
  it('404 quando não existe', async () => {
    Plans.findByPk.mockResolvedValue(null);
    const res = createMockResponse();

    await AdminPlansService.getById(
      createMockRequest({ params: { id: '99' } }),
      res
    );

    expect(res.statusCode).toBe(404);
  });

  it('400 para id inválido', async () => {
    const res = createMockResponse();

    await AdminPlansService.getById(
      createMockRequest({ params: { id: 'abc' } }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(Plans.findByPk).not.toHaveBeenCalled();
  });
});

describe('create', () => {
  it('cria plano local sem chamar gateway nenhum', async () => {
    Plans.findOne.mockResolvedValue(null);
    Plans.create.mockResolvedValue(planRow());
    const res = createMockResponse();

    await AdminPlansService.create(
      createMockRequest({ body: validBody() }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(Plans.create).toHaveBeenCalledWith(
      expect.objectContaining({ plan_name: 'pro_mensal', gateway: 'asaas' })
    );
  });

  it('400 quando o plan_name já existe', async () => {
    Plans.findOne.mockResolvedValue(planRow());
    const res = createMockResponse();

    await AdminPlansService.create(
      createMockRequest({ body: validBody() }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/já existe/i);
    expect(Plans.create).not.toHaveBeenCalled();
  });

  it('400 quando a validação falha', async () => {
    const res = createMockResponse();

    await AdminPlansService.create(
      createMockRequest({ body: validBody({ price_cents: -5 }) }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(Plans.create).not.toHaveBeenCalled();
  });
});

describe('update', () => {
  it('atualiza plano existente', async () => {
    const row = planRow();
    Plans.findByPk.mockResolvedValue(row);
    Plans.findOne.mockResolvedValue(null);
    const res = createMockResponse();

    await AdminPlansService.update(
      createMockRequest({
        params: { id: '5' },
        body: validBody({ display_name: 'Pro Plus' }),
      }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(row.update).toHaveBeenCalledWith(
      expect.objectContaining({ display_name: 'Pro Plus' })
    );
  });

  it('permite manter o próprio plan_name', async () => {
    const row = planRow();
    Plans.findByPk.mockResolvedValue(row);
    Plans.findOne.mockResolvedValue(row);
    const res = createMockResponse();

    await AdminPlansService.update(
      createMockRequest({ params: { id: '5' }, body: validBody() }),
      res
    );

    expect(res.statusCode).toBe(200);
  });

  it('400 quando o plan_name é de outro plano', async () => {
    Plans.findByPk.mockResolvedValue(planRow());
    Plans.findOne.mockResolvedValue(planRow({ id: 9 }));
    const res = createMockResponse();

    await AdminPlansService.update(
      createMockRequest({ params: { id: '5' }, body: validBody() }),
      res
    );

    expect(res.statusCode).toBe(400);
  });

  it('404 quando o plano não existe', async () => {
    Plans.findByPk.mockResolvedValue(null);
    const res = createMockResponse();

    await AdminPlansService.update(
      createMockRequest({ params: { id: '5' }, body: validBody() }),
      res
    );

    expect(res.statusCode).toBe(404);
  });
});

describe('remove', () => {
  it('arquiva em vez de apagar quando há assinante', async () => {
    const row = planRow();
    Plans.findByPk.mockResolvedValue(row);
    UserPlans.count.mockResolvedValue(3);
    const res = createMockResponse();

    await AdminPlansService.remove(
      createMockRequest({ params: { id: '5' } }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.meta.archived).toBe(true);
    expect(res.body.meta.subscribersCount).toBe(3);
    expect(row.update).toHaveBeenCalledWith({ active: false });
    expect(row.destroy).not.toHaveBeenCalled();
  });

  it('apaga de verdade quando ninguém assinou', async () => {
    const row = planRow();
    Plans.findByPk.mockResolvedValue(row);
    UserPlans.count.mockResolvedValue(0);
    const res = createMockResponse();

    await AdminPlansService.remove(
      createMockRequest({ params: { id: '5' } }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.meta.archived).toBe(false);
    expect(row.destroy).toHaveBeenCalled();
  });

  it('404 quando o plano não existe', async () => {
    Plans.findByPk.mockResolvedValue(null);
    const res = createMockResponse();

    await AdminPlansService.remove(
      createMockRequest({ params: { id: '5' } }),
      res
    );

    expect(res.statusCode).toBe(404);
  });
});
