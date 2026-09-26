jest.mock('../../src/config/stripe', () => ({}));
jest.mock('../../src/utils/emailService', () => ({ sendEmail: jest.fn() }));
jest.mock('../../src/models', () => ({
  UserPlans: { findAll: jest.fn() },
  Plans: {},
  User: {},
}));

const PaymentStripeService = require('../../src/services/paymentStripe.service');
const { UserPlans } = require('../../src/models');
const {
  createMockRequest,
  createMockResponse,
} = require('../helpers/mockResponse');

const service = new PaymentStripeService();

beforeEach(() => {
  jest.clearAllMocks();
});

/**
 * `GET /user-plan-grouped/:id` é rota legada, mas é dela que o site tira o
 * estado do plano. Sem `price_cents` no include, o front volta a depender de
 * `stripe_customer_id` para saber quem é assinante — e assinante Asaas fica de
 * fora.
 */
describe('getUserPlans (/user-plan-grouped/:id)', () => {
  it('devolve o plano do usuário com status e provider', async () => {
    const row = {
      id: 3,
      user_id: 7,
      plan_id: 11,
      status: 'active',
      provider: 'asaas',
      stripe_customer_id: null,
      mercadopago_customer_id: null,
      plans: {
        id: 11,
        plan_name: 'studio_monthly',
        display_name: 'Studio',
        tier: 'studio',
        price_cents: 7900,
        count_downloads: 0,
      },
    };
    UserPlans.findAll.mockResolvedValue([row]);

    const req = createMockRequest({ params: { id: '7' } });
    const res = createMockResponse();

    await service.getUserPlans(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ data: [row] });
  });

  it('pede price_cents e tier do plano — é o que diz se o plano é pago', async () => {
    UserPlans.findAll.mockResolvedValue([]);

    await service.getUserPlans(
      createMockRequest({ params: { id: '7' } }),
      createMockResponse()
    );

    const [{ include }] = UserPlans.findAll.mock.calls[0];
    const planInclude = include.find((item) => item.as === 'plans');

    expect(planInclude.attributes).toEqual(
      expect.arrayContaining(['price_cents', 'tier', 'count_downloads'])
    );
  });

  it('usuário sem plano devolve lista vazia em 200', async () => {
    UserPlans.findAll.mockResolvedValue([]);

    const res = createMockResponse();
    await service.getUserPlans(createMockRequest({ params: { id: '7' } }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ data: [] });
  });
  it('erro no banco responde 500 em vez de deixar a requisição pendurada', async () => {
    UserPlans.findAll.mockRejectedValue(new Error("Unknown column 'UserPlans.stripe_subscription_id'"));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = createMockResponse();
    await expect(
      service.getUserPlans(createMockRequest({ params: { id: '7' } }), res)
    ).resolves.not.toThrow();

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ message: 'Erro ao buscar planos do usuário' });
    console.error.mockRestore();
  });
});
