jest.mock('../../../src/models', () => ({
  User: { findByPk: jest.fn() },
  UserAddress: { findOne: jest.fn() },
  Plans: { findByPk: jest.fn() },
  UserPlans: { findOne: jest.fn(), create: jest.fn() },
  AsaasSubscription: { findOne: jest.fn(), create: jest.fn() },
}));

jest.mock('../../../src/services/plans/plan-notifications', () => ({
  PLAN_NOTICE_KINDS: { CANCELED: 'canceled' },
  sendPlanNotice: jest.fn(async () => ({ sent: true })),
}));

jest.mock(
  '../../../src/services/payments/gateways/asaas/asaas-api',
  () => ({
    findCustomerByCpfCnpjAsaas: jest.fn(),
    createCustomerAsaas: jest.fn(),
    createSubscriptionAsaas: jest.fn(),
    updateSubscriptionAsaas: jest.fn(),
    cancelSubscriptionAsaas: jest.fn(),
    listSubscriptionPaymentsAsaas: jest.fn(),
    tokenizeCreditCardAsaas: jest.fn(),
  })
);

const AsaasSubscriptionService = require('../../../src/services/payments/gateways/asaas/asaas-subscription.service');
const {
  User,
  UserAddress,
  Plans,
  UserPlans,
  AsaasSubscription,
} = require('../../../src/models');
const {
  findCustomerByCpfCnpjAsaas,
  createCustomerAsaas,
  createSubscriptionAsaas,
  updateSubscriptionAsaas,
  cancelSubscriptionAsaas,
  listSubscriptionPaymentsAsaas,
  tokenizeCreditCardAsaas,
} = require('../../../src/services/payments/gateways/asaas/asaas-api');
const {
  sendPlanNotice,
} = require('../../../src/services/plans/plan-notifications');
const {
  AsaasError,
} = require('../../../src/services/payments/gateways/asaas/asaas-client');
const {
  createMockRequest,
  createMockResponse,
} = require('../../helpers/mockResponse');

const VALID_CPF = '12345678909';

const userRow = (overrides = {}) => ({
  id: 42,
  name: 'Ana Souza',
  email: 'ana@example.com',
  cpf: null,
  phone: null,
  update: jest.fn(async function update(payload) {
    Object.assign(this, payload);
    return this;
  }),
  ...overrides,
});

const planRow = (overrides = {}) => ({
  id: 7,
  plan_name: 'pro_monthly',
  display_name: 'Pro',
  price_cents: 2990,
  billing_interval: 'month',
  active: true,
  gateway: 'asaas',
  ...overrides,
});

const addressRow = (overrides = {}) => ({
  postalCode: '89223005',
  number: 277,
  ...overrides,
});

const authedRequest = (body = {}) =>
  createMockRequest({ params: { userId: 42 }, body, headers: {} });

beforeEach(() => {
  jest.clearAllMocks();
  UserAddress.findOne.mockResolvedValue(null);
  UserPlans.findOne.mockResolvedValue(null);
  UserPlans.create.mockResolvedValue({});
  AsaasSubscription.findOne.mockResolvedValue(null);
});

describe('resolveBillingIdentity: CPF', () => {
  it('CPF do cadastro tem precedência e não é regravado', async () => {
    const user = userRow({ cpf: VALID_CPF });
    User.findByPk.mockResolvedValue(user);

    const identity = await AsaasSubscriptionService.resolveBillingIdentity(42, {
      cpf: '52998224725',
    });

    expect(identity.ok).toBe(true);
    expect(identity.cpfCnpj).toBe(VALID_CPF);
    expect(user.update).not.toHaveBeenCalled();
  });

  it('CPF do checkout é persistido quando o cadastro está vazio', async () => {
    const user = userRow();
    User.findByPk.mockResolvedValue(user);

    const identity = await AsaasSubscriptionService.resolveBillingIdentity(42, {
      cpf: '123.456.789-09',
    });

    expect(identity.cpfCnpj).toBe(VALID_CPF);
    expect(user.update).toHaveBeenCalledWith({ cpf: VALID_CPF });
  });

  it('CPF salvo inválido é tratado como ausente', async () => {
    // Lixo que entrou pelo cadastro antigo via admin.
    const user = userRow({ cpf: '00000000000' });
    User.findByPk.mockResolvedValue(user);

    const identity = await AsaasSubscriptionService.resolveBillingIdentity(42, {
      cpf: VALID_CPF,
    });

    expect(identity.cpfCnpj).toBe(VALID_CPF);
    expect(user.update).toHaveBeenCalledWith({ cpf: VALID_CPF });
  });

  it('sem CPF em lugar nenhum pede o dado', async () => {
    User.findByPk.mockResolvedValue(userRow());

    const identity = await AsaasSubscriptionService.resolveBillingIdentity(42, {});

    expect(identity.ok).toBe(false);
    expect(identity.message).toMatch(/informe o cpf/i);
  });

  it('CPF do checkout com dígito errado avisa que é inválido', async () => {
    const user = userRow();
    User.findByPk.mockResolvedValue(user);

    const identity = await AsaasSubscriptionService.resolveBillingIdentity(42, {
      cpf: '12345678900',
    });

    expect(identity.ok).toBe(false);
    expect(identity.message).toMatch(/cpf inválido/i);
    expect(user.update).not.toHaveBeenCalled();
  });

  it('CPF repetido em outra conta é permitido', async () => {
    const user = userRow();
    User.findByPk.mockResolvedValue(user);

    const identity = await AsaasSubscriptionService.resolveBillingIdentity(42, {
      cpf: VALID_CPF,
    });

    expect(identity.ok).toBe(true);
    // Nenhuma consulta de unicidade: bloquear quebraria conta nova legítima.
    expect(User.findByPk).toHaveBeenCalledTimes(1);
  });

  it('usuário inexistente devolve 404', async () => {
    User.findByPk.mockResolvedValue(null);

    const identity = await AsaasSubscriptionService.resolveBillingIdentity(42, {
      cpf: VALID_CPF,
    });

    expect(identity).toMatchObject({ ok: false, status: 404 });
  });
});

describe('resolveBillingIdentity: telefone e endereço', () => {
  it('telefone do checkout é persistido; o salvo vence', async () => {
    const user = userRow();
    User.findByPk.mockResolvedValue(user);

    await AsaasSubscriptionService.resolveBillingIdentity(42, {
      cpf: VALID_CPF,
      phone: '(47) 99878-1877',
    });

    expect(user.update).toHaveBeenCalledWith({
      cpf: VALID_CPF,
      phone: '47998781877',
    });

    const withPhone = userRow({ cpf: VALID_CPF, phone: '11999999999' });
    User.findByPk.mockResolvedValue(withPhone);
    const identity = await AsaasSubscriptionService.resolveBillingIdentity(42, {
      phone: '47998781877',
    });

    expect(identity.phone).toBe('11999999999');
    expect(withPhone.update).not.toHaveBeenCalled();
  });

  it('endereço salvo vence o do corpo', async () => {
    User.findByPk.mockResolvedValue(userRow({ cpf: VALID_CPF }));
    UserAddress.findOne.mockResolvedValue(addressRow());

    const identity = await AsaasSubscriptionService.resolveBillingIdentity(42, {
      postalCode: '01001000',
      addressNumber: '999',
    });

    expect(identity.postalCode).toBe('89223005');
    expect(identity.addressNumber).toBe(277);
  });

  it('sem endereço salvo usa o do checkout', async () => {
    User.findByPk.mockResolvedValue(userRow({ cpf: VALID_CPF }));

    const identity = await AsaasSubscriptionService.resolveBillingIdentity(42, {
      postalCode: '01001000',
      addressNumber: '999',
    });

    expect(identity.postalCode).toBe('01001000');
    expect(identity.addressNumber).toBe('999');
  });
});

describe('createSubscription', () => {
  beforeEach(() => {
    Plans.findByPk.mockResolvedValue(planRow());
    User.findByPk.mockResolvedValue(userRow({ cpf: VALID_CPF }));
    findCustomerByCpfCnpjAsaas.mockResolvedValue({ id: 'cus_1' });
    // Sem `invoiceUrl`: a resposta da assinatura no Asaas não traz esse campo —
    // ele pertence à cobrança. Mockar aqui era o que escondia o checkout mudo.
    createSubscriptionAsaas.mockResolvedValue({
      id: 'sub_1',
      status: 'ACTIVE',
      billingType: 'PIX',
      cycle: 'MONTHLY',
      value: 29.9,
      nextDueDate: '2026-10-07',
    });
    listSubscriptionPaymentsAsaas.mockResolvedValue({
      data: [
        {
          id: 'pay_1',
          status: 'PENDING',
          invoiceUrl: 'https://asaas.com/i/pay_1',
          bankSlipUrl: null,
        },
      ],
    });
    AsaasSubscription.create.mockImplementation(async (payload) => ({
      id: 1,
      ...payload,
    }));
  });

  it('assina no Pix e nasce pendente, não ativo', async () => {
    const res = createMockResponse();

    await AsaasSubscriptionService.createSubscription(
      authedRequest({ planId: 7, billingType: 'PIX' }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(UserPlans.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending', provider: 'asaas' })
    );
  });

  it('devolve o link da cobrança, não o da assinatura', async () => {
    const res = createMockResponse();

    await AsaasSubscriptionService.createSubscription(
      authedRequest({ planId: 7, billingType: 'PIX' }),
      res
    );

    expect(listSubscriptionPaymentsAsaas).toHaveBeenCalledWith('sub_1');
    expect(res.body.meta.invoiceUrl).toBe('https://asaas.com/i/pay_1');
  });

  it('ignora cobrança já paga e usa o boleto quando não há invoiceUrl', async () => {
    listSubscriptionPaymentsAsaas.mockResolvedValue({
      data: [
        { id: 'pay_0', status: 'RECEIVED', invoiceUrl: 'https://asaas.com/i/paga' },
        { id: 'pay_1', status: 'PENDING', bankSlipUrl: 'https://asaas.com/b/1' },
      ],
    });
    const res = createMockResponse();

    await AsaasSubscriptionService.createSubscription(
      authedRequest({ planId: 7, billingType: 'BOLETO' }),
      res
    );

    expect(res.body.meta.invoiceUrl).toBe('https://asaas.com/b/1');
  });

  it('cobrança ainda não gerada não derruba a assinatura', async () => {
    listSubscriptionPaymentsAsaas.mockResolvedValue({ data: [] });
    const res = createMockResponse();

    await AsaasSubscriptionService.createSubscription(
      authedRequest({ planId: 7, billingType: 'PIX' }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.meta.invoiceUrl).toBeNull();
  });

  it('falha ao buscar a cobrança não vira erro 500 na assinatura', async () => {
    listSubscriptionPaymentsAsaas.mockRejectedValue(new Error('timeout'));
    const res = createMockResponse();

    await AsaasSubscriptionService.createSubscription(
      authedRequest({ planId: 7, billingType: 'PIX' }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.meta.invoiceUrl).toBeNull();
  });

  it('aceita o CPF no mesmo request do checkout', async () => {
    const user = userRow();
    User.findByPk.mockResolvedValue(user);
    const res = createMockResponse();

    await AsaasSubscriptionService.createSubscription(
      authedRequest({ planId: 7, billingType: 'PIX', cpf: '123.456.789-09' }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(user.update).toHaveBeenCalledWith({ cpf: VALID_CPF });
  });

  it('sem CPF recusa antes de chamar o Asaas', async () => {
    User.findByPk.mockResolvedValue(userRow());
    const res = createMockResponse();

    await AsaasSubscriptionService.createSubscription(
      authedRequest({ planId: 7, billingType: 'PIX' }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(createSubscriptionAsaas).not.toHaveBeenCalled();
  });

  it('cria cliente no Asaas quando não existe', async () => {
    findCustomerByCpfCnpjAsaas.mockResolvedValue(null);
    createCustomerAsaas.mockResolvedValue({ id: 'cus_novo' });
    const res = createMockResponse();

    await AsaasSubscriptionService.createSubscription(
      authedRequest({ planId: 7, billingType: 'PIX' }),
      res
    );

    expect(createCustomerAsaas).toHaveBeenCalled();
    expect(createSubscriptionAsaas).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_novo' })
    );
  });

  it('cartão sem token é recusado', async () => {
    const res = createMockResponse();

    await AsaasSubscriptionService.createSubscription(
      authedRequest({ planId: 7, billingType: 'CREDIT_CARD' }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/tokenizado/i);
    expect(createSubscriptionAsaas).not.toHaveBeenCalled();
  });

  it('assinatura ativa existente bloqueia nova', async () => {
    AsaasSubscription.findOne.mockResolvedValue({ id: 1 });
    const res = createMockResponse();

    await AsaasSubscriptionService.createSubscription(
      authedRequest({ planId: 7, billingType: 'PIX' }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/já tem uma assinatura ativa/i);
  });

  it('plano de outro gateway é recusado', async () => {
    Plans.findByPk.mockResolvedValue(planRow({ gateway: 'stripe' }));
    const res = createMockResponse();

    await AsaasSubscriptionService.createSubscription(
      authedRequest({ planId: 7, billingType: 'PIX' }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/asaas/i);
  });

  it('plano inexistente devolve 404', async () => {
    Plans.findByPk.mockResolvedValue(null);
    const res = createMockResponse();

    await AsaasSubscriptionService.createSubscription(
      authedRequest({ planId: 7, billingType: 'PIX' }),
      res
    );

    expect(res.statusCode).toBe(404);
  });
});

describe('cancelSubscription', () => {
  const subscriptionRow = () => ({
    id: 3,
    user_id: 42,
    plan_id: 7,
    asaas_subscription_id: 'sub_1',
    asaas_status: 'ACTIVE',
    asaas_next_due_date: '2026-10-07',
    update: jest.fn(async function update(payload) {
      Object.assign(this, payload);
      return this;
    }),
  });

  beforeEach(() => {
    Plans.findByPk.mockResolvedValue(planRow());
    User.findByPk.mockResolvedValue(userRow({ cpf: VALID_CPF }));
    cancelSubscriptionAsaas.mockResolvedValue({});
    AsaasSubscription.findOne.mockResolvedValue(subscriptionRow());
    UserPlans.findOne.mockResolvedValue({
      user_id: 42,
      update: jest.fn(),
    });
  });

  it('confirma o cancelamento por e-mail com a data de acesso', async () => {
    const res = createMockResponse();

    await AsaasSubscriptionService.cancelSubscription(authedRequest(), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.meta.accessUntil).toBe('2026-10-07');
    expect(sendPlanNotice).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'canceled',
        planName: 'Pro',
        accessUntil: '2026-10-07',
      })
    );
  });

  it('falha no aviso não desfaz o cancelamento', async () => {
    sendPlanNotice.mockRejectedValueOnce(new Error('smtp fora'));
    const res = createMockResponse();

    await AsaasSubscriptionService.cancelSubscription(authedRequest(), res);

    expect(res.statusCode).toBe(200);
    expect(cancelSubscriptionAsaas).toHaveBeenCalledWith('sub_1');
  });
});

describe('tokenizeCreditCard', () => {
  const cardBody = (overrides = {}) => ({
    holderName: 'ANA P SOUZA',
    number: '5162306219378829',
    expiryMonth: '05',
    expiryYear: '2030',
    ccv: '318',
    postalCode: '89223005',
    addressNumber: '277',
    phone: '47998781877',
    ...overrides,
  });

  beforeEach(() => {
    User.findByPk.mockResolvedValue(
      userRow({ cpf: VALID_CPF, phone: '47998781877' })
    );
    UserAddress.findOne.mockResolvedValue(addressRow());
    findCustomerByCpfCnpjAsaas.mockResolvedValue({ id: 'cus_1' });
    tokenizeCreditCardAsaas.mockResolvedValue({
      creditCardToken: 'tok_1',
      creditCardNumber: '8829',
      creditCardBrand: 'MASTERCARD',
    });
  });

  it('devolve token sem devolver o número do cartão', async () => {
    const res = createMockResponse();

    await AsaasSubscriptionService.tokenizeCreditCard(
      authedRequest(cardBody()),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual({
      creditCardToken: 'tok_1',
      creditCardNumber: '8829',
      creditCardBrand: 'MASTERCARD',
    });
    expect(JSON.stringify(res.body)).not.toContain('5162306219378829');
  });

  it('manda o titular montado a partir do cadastro', async () => {
    const res = createMockResponse();

    await AsaasSubscriptionService.tokenizeCreditCard(
      authedRequest(cardBody()),
      res
    );

    expect(tokenizeCreditCardAsaas).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_1',
        creditCardHolderInfo: expect.objectContaining({
          cpfCnpj: VALID_CPF,
          postalCode: '89223005',
          addressNumber: '277',
        }),
      })
    );
  });

  it('CPF vindo do checkout habilita a tokenização', async () => {
    const user = userRow({ phone: '47998781877' });
    User.findByPk.mockResolvedValue(user);
    const res = createMockResponse();

    await AsaasSubscriptionService.tokenizeCreditCard(
      authedRequest(cardBody({ cpf: '123.456.789-09' })),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(user.update).toHaveBeenCalledWith({ cpf: VALID_CPF });
  });

  it('cartão inválido não chega no Asaas', async () => {
    const res = createMockResponse();

    await AsaasSubscriptionService.tokenizeCreditCard(
      authedRequest(cardBody({ number: '123' })),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(tokenizeCreditCardAsaas).not.toHaveBeenCalled();
  });

  it('sem CEP salvo nem informado, recusa explicando', async () => {
    UserAddress.findOne.mockResolvedValue(null);
    const res = createMockResponse();

    await AsaasSubscriptionService.tokenizeCreditCard(
      authedRequest(cardBody({ postalCode: undefined })),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/CEP/i);
  });

  it('recusa do Asaas vira 400 sem vazar o cartão', async () => {
    tokenizeCreditCardAsaas.mockRejectedValue(
      new AsaasError('Cartão recusado pela operadora', { status: 400 })
    );
    const res = createMockResponse();

    await AsaasSubscriptionService.tokenizeCreditCard(
      authedRequest(cardBody()),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Cartão recusado pela operadora');
    expect(JSON.stringify(res.body)).not.toContain('5162306219378829');
  });

  it('erro inesperado devolve 500 genérico', async () => {
    tokenizeCreditCardAsaas.mockRejectedValue(new Error('socket hang up'));
    const res = createMockResponse();

    await AsaasSubscriptionService.tokenizeCreditCard(
      authedRequest(cardBody()),
      res
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.message).not.toMatch(/socket/);
  });
});

describe('changeBillingType', () => {
  const subscriptionRow = (overrides = {}) => ({
    id: 5,
    user_id: 42,
    plan_id: 7,
    asaas_subscription_id: 'sub_1',
    asaas_billing_type: 'BOLETO',
    asaas_status: 'ACTIVE',
    update: jest.fn(async function update(payload) {
      Object.assign(this, payload);
      return this;
    }),
    ...overrides,
  });

  beforeEach(() => {
    AsaasSubscription.findOne.mockResolvedValue(subscriptionRow());
    Plans.findByPk.mockResolvedValue(planRow());
    updateSubscriptionAsaas.mockResolvedValue({
      id: 'sub_1',
      billingType: 'CREDIT_CARD',
    });
    listSubscriptionPaymentsAsaas.mockResolvedValue({
      data: [
        {
          id: 'pay_1',
          status: 'PENDING',
          invoiceUrl: 'https://asaas.com/i/pay_1',
        },
      ],
    });
  });

  it('converte a cobrança pendente em vez de criar outra', async () => {
    const res = createMockResponse();

    await AsaasSubscriptionService.changeBillingType(
      authedRequest({ billingType: 'CREDIT_CARD', creditCardToken: 'tok_1' }),
      res
    );

    expect(res.statusCode).toBe(200);
    // Sem `updatePendingPayments`, o boleto pendente sobreviveria ao lado da
    // fatura do cartão — cobrança dupla no mesmo mês.
    expect(updateSubscriptionAsaas).toHaveBeenCalledWith('sub_1', {
      billingType: 'CREDIT_CARD',
      updatePendingPayments: true,
      creditCardToken: 'tok_1',
    });
  });

  it('grava a forma de pagamento nova no nosso registro', async () => {
    const row = subscriptionRow();
    AsaasSubscription.findOne.mockResolvedValue(row);
    const res = createMockResponse();

    await AsaasSubscriptionService.changeBillingType(
      authedRequest({ billingType: 'CREDIT_CARD', creditCardToken: 'tok_1' }),
      res
    );

    expect(row.update).toHaveBeenCalledWith({
      asaas_billing_type: 'CREDIT_CARD',
    });
    expect(res.body.data.billingType).toBe('CREDIT_CARD');
  });

  it('cartão sem token é recusado antes de chamar o Asaas', async () => {
    const res = createMockResponse();

    await AsaasSubscriptionService.changeBillingType(
      authedRequest({ billingType: 'CREDIT_CARD' }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/cartão/i);
    expect(updateSubscriptionAsaas).not.toHaveBeenCalled();
  });

  it('trocar para a forma que já está em uso é recusado', async () => {
    const res = createMockResponse();

    await AsaasSubscriptionService.changeBillingType(
      authedRequest({ billingType: 'BOLETO' }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(updateSubscriptionAsaas).not.toHaveBeenCalled();
  });

  it('forma de pagamento inválida não vira UNDEFINED silencioso', async () => {
    const res = createMockResponse();

    await AsaasSubscriptionService.changeBillingType(
      authedRequest({ billingType: 'UNDEFINED' }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(updateSubscriptionAsaas).not.toHaveBeenCalled();
  });

  it('sem assinatura ativa devolve 404', async () => {
    AsaasSubscription.findOne.mockResolvedValue(null);
    const res = createMockResponse();

    await AsaasSubscriptionService.changeBillingType(
      authedRequest({ billingType: 'PIX' }),
      res
    );

    expect(res.statusCode).toBe(404);
  });

  it('recusa do Asaas vira 400 com a mensagem dele', async () => {
    updateSubscriptionAsaas.mockRejectedValue(
      new AsaasError('Cartão recusado pela operadora', { status: 400 })
    );
    const res = createMockResponse();

    await AsaasSubscriptionService.changeBillingType(
      authedRequest({ billingType: 'CREDIT_CARD', creditCardToken: 'tok_1' }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Cartão recusado pela operadora');
  });

  it('erro inesperado devolve 500 genérico', async () => {
    updateSubscriptionAsaas.mockRejectedValue(new Error('socket hang up'));
    const res = createMockResponse();

    await AsaasSubscriptionService.changeBillingType(
      authedRequest({ billingType: 'PIX' }),
      res
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.message).not.toMatch(/socket/);
  });
});
