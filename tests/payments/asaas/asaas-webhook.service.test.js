jest.mock('../../../src/models', () => ({
  User: { findByPk: jest.fn() },
  Plans: { findByPk: jest.fn() },
  UserPlans: { findOne: jest.fn() },
  AsaasSubscription: { findOne: jest.fn() },
  AsaasWebhookEvent: { findOrCreate: jest.fn() },
}));

jest.mock('../../../src/services/plans/plan-notifications', () => ({
  PLAN_NOTICE_KINDS: { PAST_DUE: 'past_due', CANCELED: 'canceled' },
  sendPlanNotice: jest.fn(async () => ({ sent: true })),
}));

const AsaasWebhookService = require('../../../src/services/payments/gateways/asaas/asaas-webhook.service');
const {
  User,
  Plans,
  UserPlans,
  AsaasSubscription,
  AsaasWebhookEvent,
} = require('../../../src/models');
const {
  sendPlanNotice,
} = require('../../../src/services/plans/plan-notifications');
const {
  createMockRequest,
  createMockResponse,
} = require('../../helpers/mockResponse');
const {
  ASAAS_WEBHOOK_TOKEN_HEADER,
} = require('../../../src/services/payments/gateways/asaas/asaas-webhook-verify');

const VALID_TOKEN = 'token-de-webhook-com-tamanho-ok';

const webhookRequest = (body) =>
  createMockRequest({
    headers: { [ASAAS_WEBHOOK_TOKEN_HEADER]: VALID_TOKEN },
    body,
  });

const paymentEvent = ({ payment, ...overrides } = {}) => ({
  id: 'evt_1',
  event: 'PAYMENT_CONFIRMED',
  ...overrides,
  payment: {
    id: 'pay_1',
    subscription: 'sub_1',
    externalReference: 'plan:2;user:42',
    dueDate: '2027-02-15',
    ...(payment || {}),
  },
});

const eventRow = (processedAt = null) => ({
  asaas_processed_at: processedAt,
  update: jest.fn(async function update(payload) {
    Object.assign(this, payload);
    return this;
  }),
});

const userPlanRow = (overrides = {}) => ({
  user_id: 42,
  // Mesmo plano do `externalReference`: troca de plano é o caso especial.
  plan_id: 2,
  status: 'pending',
  update: jest.fn(async function update(payload) {
    Object.assign(this, payload);
    return this;
  }),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  process.env.ASAAS_WEBHOOK_TOKEN = VALID_TOKEN;
  User.findByPk.mockResolvedValue({
    id: 42,
    name: 'Ana Souza',
    email: 'ana@example.com',
  });
  Plans.findByPk.mockResolvedValue({ display_name: 'Pro' });
});

afterAll(() => {
  delete process.env.ASAAS_WEBHOOK_TOKEN;
});

describe('handleWebhook: autenticação', () => {
  it('400 com token errado, sem tocar no banco', async () => {
    const res = createMockResponse();
    const req = createMockRequest({
      headers: { [ASAAS_WEBHOOK_TOKEN_HEADER]: 'token-errado-mas-do-tam' },
      body: paymentEvent(),
    });

    await AsaasWebhookService.handleWebhook(req, res);

    expect(res.statusCode).toBe(400);
    expect(AsaasWebhookEvent.findOrCreate).not.toHaveBeenCalled();
  });

  it('500 quando o webhook não está configurado', async () => {
    delete process.env.ASAAS_WEBHOOK_TOKEN;
    const res = createMockResponse();

    await AsaasWebhookService.handleWebhook(webhookRequest(paymentEvent()), res);

    expect(res.statusCode).toBe(500);
  });
});

describe('handleWebhook: idempotência', () => {
  it('processa o evento na primeira entrega', async () => {
    const row = eventRow();
    const plan = userPlanRow();
    AsaasWebhookEvent.findOrCreate.mockResolvedValue([row, true]);
    AsaasSubscription.findOne.mockResolvedValue(null);
    UserPlans.findOne.mockResolvedValue(plan);
    const res = createMockResponse();

    await AsaasWebhookService.handleWebhook(webhookRequest(paymentEvent()), res);

    expect(res.statusCode).toBe(200);
    expect(plan.update).toHaveBeenCalledWith({
      status: 'active',
      provider: 'asaas',
    });
    expect(row.update).toHaveBeenCalledWith(
      expect.objectContaining({ asaas_processed_at: expect.any(Date) })
    );
  });

  it('reentrega do mesmo evento não reprocessa', async () => {
    AsaasWebhookEvent.findOrCreate.mockResolvedValue([
      eventRow(new Date()),
      false,
    ]);
    const res = createMockResponse();

    await AsaasWebhookService.handleWebhook(webhookRequest(paymentEvent()), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.meta.duplicated).toBe(true);
    expect(UserPlans.findOne).not.toHaveBeenCalled();
  });

  it('linha existente ainda não processada segue o fluxo', async () => {
    const row = eventRow(null);
    const plan = userPlanRow();
    AsaasWebhookEvent.findOrCreate.mockResolvedValue([row, false]);
    AsaasSubscription.findOne.mockResolvedValue(null);
    UserPlans.findOne.mockResolvedValue(plan);
    const res = createMockResponse();

    await AsaasWebhookService.handleWebhook(webhookRequest(paymentEvent()), res);

    expect(plan.update).toHaveBeenCalled();
  });
});

describe('handleWebhook: efeito no acesso', () => {
  beforeEach(() => {
    AsaasWebhookEvent.findOrCreate.mockResolvedValue([eventRow(), true]);
    AsaasSubscription.findOne.mockResolvedValue(null);
  });

  it('PAYMENT_OVERDUE marca past_due, não suspende', async () => {
    const plan = userPlanRow();
    UserPlans.findOne.mockResolvedValue(plan);
    const res = createMockResponse();

    await AsaasWebhookService.handleWebhook(
      webhookRequest(paymentEvent({ event: 'PAYMENT_OVERDUE' })),
      res
    );

    expect(plan.update).toHaveBeenCalledWith({
      status: 'past_due',
      provider: 'asaas',
    });
  });

  it('PAYMENT_OVERDUE avisa o assinante com o link da fatura', async () => {
    UserPlans.findOne.mockResolvedValue(userPlanRow());
    const res = createMockResponse();

    await AsaasWebhookService.handleWebhook(
      webhookRequest(
        paymentEvent({
          id: 'evt_8',
          event: 'PAYMENT_OVERDUE',
          payment: { invoiceUrl: 'https://asaas.com/i/atrasada' },
        })
      ),
      res
    );

    expect(sendPlanNotice).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'past_due',
        planName: 'Pro',
        invoiceUrl: 'https://asaas.com/i/atrasada',
      })
    );
  });

  it('falha ao avisar não derruba o processamento do evento', async () => {
    UserPlans.findOne.mockResolvedValue(userPlanRow());
    User.findByPk.mockRejectedValue(new Error('db lenta'));
    const res = createMockResponse();

    await AsaasWebhookService.handleWebhook(
      webhookRequest(paymentEvent({ id: 'evt_9', event: 'PAYMENT_OVERDUE' })),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.meta.applied).toBe(true);
  });

  it('pagamento confirmado não dispara aviso de atraso', async () => {
    UserPlans.findOne.mockResolvedValue(userPlanRow());
    const res = createMockResponse();

    await AsaasWebhookService.handleWebhook(
      webhookRequest(paymentEvent({ id: 'evt_10' })),
      res
    );

    expect(sendPlanNotice).not.toHaveBeenCalled();
  });

  it('SUBSCRIPTION_DELETED cancela e inativa a assinatura local', async () => {
    const plan = userPlanRow();
    const subscription = {
      user_id: 42,
      update: jest.fn(),
    };
    UserPlans.findOne.mockResolvedValue(plan);
    AsaasSubscription.findOne.mockResolvedValue(subscription);
    const res = createMockResponse();

    await AsaasWebhookService.handleWebhook(
      webhookRequest({
        id: 'evt_2',
        event: 'SUBSCRIPTION_DELETED',
        subscription: {
          id: 'sub_1',
          externalReference: 'plan:2;user:42',
        },
      }),
      res
    );

    expect(plan.update).toHaveBeenCalledWith({
      status: 'canceled',
      provider: 'asaas',
    });
    expect(subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ asaas_status: 'INACTIVE' })
    );
  });

  it('PAYMENT_CREATED é reconhecido mas não muda acesso', async () => {
    const res = createMockResponse();

    await AsaasWebhookService.handleWebhook(
      webhookRequest(paymentEvent({ id: 'evt_3', event: 'PAYMENT_CREATED' })),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.meta.applied).toBe(false);
    expect(UserPlans.findOne).not.toHaveBeenCalled();
  });

  it('sem externalReference cai no fallback da tabela local', async () => {
    const plan = userPlanRow();
    AsaasSubscription.findOne.mockResolvedValue({ user_id: 42, update: jest.fn() });
    UserPlans.findOne.mockResolvedValue(plan);
    const res = createMockResponse();

    await AsaasWebhookService.handleWebhook(
      webhookRequest(
        paymentEvent({ id: 'evt_4', payment: { externalReference: null } })
      ),
      res
    );

    expect(UserPlans.findOne).toHaveBeenCalledWith({ where: { user_id: 42 } });
    expect(plan.update).toHaveBeenCalled();
  });

  it('dono não encontrado devolve 200 para não travar a fila', async () => {
    AsaasSubscription.findOne.mockResolvedValue(null);
    const res = createMockResponse();

    await AsaasWebhookService.handleWebhook(
      webhookRequest(
        paymentEvent({ id: 'evt_5', payment: { externalReference: null } })
      ),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.meta.applied).toBe(false);
  });

  it('pagamento confirmado de outro plano efetiva a troca', async () => {
    const plan = userPlanRow({ plan_id: 1, status: 'active' });
    UserPlans.findOne.mockResolvedValue(plan);
    const res = createMockResponse();

    await AsaasWebhookService.handleWebhook(
      webhookRequest(paymentEvent({ id: 'evt_6' })),
      res
    );

    expect(plan.update).toHaveBeenCalledWith({
      status: 'active',
      provider: 'asaas',
      plan_id: 2,
      plan_canceled: false,
    });
  });

  it('cobrança vencida do plano novo não efetiva a troca', async () => {
    const plan = userPlanRow({ plan_id: 1, status: 'active' });
    UserPlans.findOne.mockResolvedValue(plan);
    const res = createMockResponse();

    await AsaasWebhookService.handleWebhook(
      webhookRequest(paymentEvent({ id: 'evt_7', event: 'PAYMENT_OVERDUE' })),
      res
    );

    // Quem pagou o plano antigo continua nele até o novo ser pago.
    expect(plan.update).toHaveBeenCalledWith({
      status: 'past_due',
      provider: 'asaas',
    });
  });

  it('falha de banco devolve 500 para o Asaas reentregar', async () => {
    AsaasWebhookEvent.findOrCreate.mockRejectedValue(new Error('db down'));
    const res = createMockResponse();

    await AsaasWebhookService.handleWebhook(webhookRequest(paymentEvent()), res);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).not.toMatch(/db down/);
  });
});
