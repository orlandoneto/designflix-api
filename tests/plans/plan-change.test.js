jest.mock('../../src/models', () => ({
  User: { findByPk: jest.fn() },
  UserAddress: { findOne: jest.fn() },
  Plans: { findByPk: jest.fn() },
  UserPlans: { findOne: jest.fn(), create: jest.fn() },
  AsaasSubscription: { findOne: jest.fn(), create: jest.fn() },
}));

jest.mock('../../src/services/plans/plan-notifications', () => ({
  PLAN_NOTICE_KINDS: { CANCELED: 'canceled' },
  sendPlanNotice: jest.fn(async () => ({ sent: true })),
}));

jest.mock('../../src/services/payments/gateways/asaas/asaas-api', () => ({
  findCustomerByCpfCnpjAsaas: jest.fn(),
  createCustomerAsaas: jest.fn(),
  createSubscriptionAsaas: jest.fn(),
  cancelSubscriptionAsaas: jest.fn(),
  listSubscriptionPaymentsAsaas: jest.fn(),
  tokenizeCreditCardAsaas: jest.fn(),
}));

const AsaasSubscriptionService = require('../../src/services/payments/gateways/asaas/asaas-subscription.service');
const {
  User,
  UserAddress,
  Plans,
  UserPlans,
  AsaasSubscription,
} = require('../../src/models');
const {
  createSubscriptionAsaas,
  cancelSubscriptionAsaas,
  findCustomerByCpfCnpjAsaas,
} = require('../../src/services/payments/gateways/asaas/asaas-api');
const {
  AsaasError,
} = require('../../src/services/payments/gateways/asaas/asaas-client');
const {
  createMockRequest,
  createMockResponse,
} = require('../helpers/mockResponse');

const VALID_CPF = '12345678909';

const proPlan = {
  id: 2,
  plan_name: 'pro_mensal',
  display_name: 'Pro',
  price_cents: 2990,
  billing_interval: 'month',
  active: true,
  gateway: 'asaas',
};

const studioPlan = {
  id: 3,
  plan_name: 'studio_mensal',
  display_name: 'Studio',
  price_cents: 9990,
  billing_interval: 'month',
  active: true,
  gateway: 'asaas',
};

const activeSubscription = (overrides = {}) => ({
  id: 11,
  user_id: 42,
  plan_id: proPlan.id,
  plan: proPlan,
  asaas_subscription_id: 'sub_antiga',
  asaas_billing_type: 'PIX',
  asaas_cycle: 'MONTHLY',
  asaas_status: 'ACTIVE',
  asaas_next_due_date: '2026-10-07',
  update: jest.fn(async function update(payload) {
    Object.assign(this, payload);
    return this;
  }),
  ...overrides,
});

const userPlanRow = (overrides = {}) => ({
  user_id: 42,
  plan_id: proPlan.id,
  status: 'active',
  update: jest.fn(async function update(payload) {
    Object.assign(this, payload);
    return this;
  }),
  ...overrides,
});

const changeRequest = (body = { planId: studioPlan.id }) =>
  createMockRequest({ params: { userId: 42 }, body, headers: {} });

beforeEach(() => {
  jest.clearAllMocks();
  User.findByPk.mockResolvedValue({
    id: 42,
    name: 'Ana Souza',
    email: 'ana@example.com',
    cpf: VALID_CPF,
    phone: '11999999999',
    update: jest.fn(),
  });
  UserAddress.findOne.mockResolvedValue(null);
  UserPlans.findOne.mockResolvedValue(userPlanRow());
  findCustomerByCpfCnpjAsaas.mockResolvedValue({ id: 'cus_1' });
  createSubscriptionAsaas.mockResolvedValue({
    id: 'sub_nova',
    status: 'ACTIVE',
    billingType: 'PIX',
    cycle: 'MONTHLY',
    value: 99.9,
    nextDueDate: '2026-09-08',
    invoiceUrl: 'https://asaas.com/i/nova',
  });
  AsaasSubscription.create.mockImplementation(async (payload) => ({
    id: 12,
    ...payload,
  }));
  Plans.findByPk.mockResolvedValue(studioPlan);
  AsaasSubscription.findOne.mockResolvedValue(activeSubscription());
});

describe('changePlan', () => {
  it('cancela a antiga, cria a nova e não mexe no acesso ainda', async () => {
    const userPlan = userPlanRow();
    UserPlans.findOne.mockResolvedValue(userPlan);
    const res = createMockResponse();

    await AsaasSubscriptionService.changePlan(changeRequest(), res);

    expect(res.statusCode).toBe(200);
    expect(cancelSubscriptionAsaas).toHaveBeenCalledWith('sub_antiga');
    expect(createSubscriptionAsaas).toHaveBeenCalledTimes(1);
    expect(res.body.meta.planChange).toEqual({
      kind: 'upgrade',
      fromPlanId: proPlan.id,
      toPlanId: studioPlan.id,
      effective: 'on_payment',
    });
    expect(res.body.meta.invoiceUrl).toBe('https://asaas.com/i/nova');
    // O plano só muda quando o webhook confirmar o pagamento.
    expect(userPlan.update).not.toHaveBeenCalled();
  });

  it('repete a forma de pagamento atual quando o corpo não manda', async () => {
    const res = createMockResponse();

    await AsaasSubscriptionService.changePlan(changeRequest(), res);

    expect(createSubscriptionAsaas).toHaveBeenCalledWith(
      expect.objectContaining({ billingType: 'PIX' })
    );
  });

  it('400 sem assinatura ativa para trocar', async () => {
    AsaasSubscription.findOne.mockResolvedValue(null);
    const res = createMockResponse();

    await AsaasSubscriptionService.changePlan(changeRequest(), res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/não tem assinatura ativa/i);
    expect(cancelSubscriptionAsaas).not.toHaveBeenCalled();
  });

  it('400 ao trocar para o mesmo plano, sem cancelar nada', async () => {
    Plans.findByPk.mockResolvedValue(proPlan);
    const res = createMockResponse();

    await AsaasSubscriptionService.changePlan(
      changeRequest({ planId: proPlan.id }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/já está neste plano/i);
    expect(cancelSubscriptionAsaas).not.toHaveBeenCalled();
  });

  it('404 quando o plano de destino não existe', async () => {
    Plans.findByPk.mockResolvedValue(null);
    const res = createMockResponse();

    await AsaasSubscriptionService.changePlan(changeRequest(), res);

    expect(res.statusCode).toBe(404);
    expect(cancelSubscriptionAsaas).not.toHaveBeenCalled();
  });

  it('cartão sem token não cancela a assinatura atual', async () => {
    const res = createMockResponse();

    await AsaasSubscriptionService.changePlan(
      changeRequest({ planId: studioPlan.id, billingType: 'CREDIT_CARD' }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/cartão não tokenizado/i);
    expect(cancelSubscriptionAsaas).not.toHaveBeenCalled();
  });

  it('falha ao criar a nova encerra o acesso no fim do período pago', async () => {
    const userPlan = userPlanRow();
    UserPlans.findOne.mockResolvedValue(userPlan);
    createSubscriptionAsaas.mockRejectedValue(
      new AsaasError('Cartão recusado', { status: 400 })
    );
    const res = createMockResponse();

    await AsaasSubscriptionService.changePlan(changeRequest(), res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/cartão recusado/i);
    expect(userPlan.update).toHaveBeenCalledWith({
      plan_canceled: true,
      plan_finish_at: '2026-10-07',
    });
  });
});
