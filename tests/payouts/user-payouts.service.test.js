jest.mock('../../src/models', () => ({
  User: { findOne: jest.fn(), update: jest.fn() },
  UserPayout: { create: jest.fn() },
  UserCommission: { findAll: jest.fn(), update: jest.fn() },
}));

jest.mock('../../src/services/payments/gateways/asaas/asaas-api', () => ({
  createTransferAsaas: jest.fn(),
}));

const UserPayoutsServices = require('../../src/services/user-payouts.service');
const { User, UserPayout, UserCommission } = require('../../src/models');
const {
  createTransferAsaas,
} = require('../../src/services/payments/gateways/asaas/asaas-api');
const {
  AsaasError,
} = require('../../src/services/payments/gateways/asaas/asaas-client');
const {
  createMockRequest,
  createMockResponse,
} = require('../helpers/mockResponse');

const userRow = (overrides = {}) => ({
  id: 42,
  balance: '200.00',
  chavePix: 'ana@example.com',
  lastPayout: null,
  ...overrides,
});

const pendingCommissions = () => [
  { id: 1, amount: '100.00' },
  { id: 2, amount: '40.00' },
  { id: 3, amount: '30.00' },
];

const authedRequest = (body = {}) =>
  createMockRequest({ params: { userId: 42 }, body });

beforeEach(() => {
  process.env.ASAAS_API_KEY = 'chave-de-teste';
  jest.spyOn(console, 'error').mockImplementation(() => {});
  User.findOne.mockResolvedValue(userRow());
  User.update.mockResolvedValue([1]);
  UserPayout.create.mockResolvedValue({ id: 7 });
  UserCommission.findAll.mockResolvedValue(pendingCommissions());
  UserCommission.update.mockResolvedValue([2]);
  createTransferAsaas.mockResolvedValue({ id: 'tra_123', status: 'PENDING' });
});

afterEach(() => {
  delete process.env.ASAAS_API_KEY;
});

describe('requestPayout: saque bem-sucedido', () => {
  it('transfere no Asaas, registra o payout, quita comissões e debita o saldo', async () => {
    const res = createMockResponse();

    await UserPayoutsServices.requestPayout(authedRequest({ amount: 150 }), res);

    expect(createTransferAsaas).toHaveBeenCalledWith({
      value: 150,
      operationType: 'PIX',
      pixAddressKey: 'ana@example.com',
      description: 'Saque Designflix - colaborador 42',
    });

    expect(UserPayout.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42,
        amount: 150,
        status: 'paid',
        paidAt: expect.any(Date),
        requestedAt: expect.any(Date),
      })
    );

    // 100 + 40 fecham em 140; a de 30 estouraria os 150 e fica pendente.
    expect(UserCommission.update).toHaveBeenCalledWith(
      { status: 'paid' },
      { where: { id: [1, 2] } }
    );

    expect(User.update).toHaveBeenCalledWith(
      { balance: 50, lastPayout: expect.any(Date) },
      { where: { id: 42 } }
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Saque de R$ 150,00 enviado via Pix.');
    expect(res.body.data).toEqual(
      expect.objectContaining({
        payoutId: 7,
        amount: 150,
        status: 'paid',
        balance: 50,
        transferId: 'tra_123',
        transferStatus: 'PENDING',
        settledCommissions: 2,
        settledTotal: 140,
      })
    );
  });

  it('não desconta taxa: o valor transferido é o valor pedido', async () => {
    await UserPayoutsServices.requestPayout(
      authedRequest({ amount: 200 }),
      createMockResponse()
    );

    expect(createTransferAsaas).toHaveBeenCalledWith(
      expect.objectContaining({ value: 200 })
    );
  });

  it('não chama update de comissão quando nada é liquidado', async () => {
    UserCommission.findAll.mockResolvedValue([]);
    const res = createMockResponse();

    await UserPayoutsServices.requestPayout(authedRequest({ amount: 150 }), res);

    expect(UserCommission.update).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.body.data.settledCommissions).toBe(0);
  });
});

describe('requestPayout: usuário vem do token', () => {
  it('ignora o userId do corpo e usa o do token', async () => {
    const req = createMockRequest({
      params: { userId: 42 },
      body: { userId: 999, amount: 150 },
    });

    await UserPayoutsServices.requestPayout(req, createMockResponse());

    expect(User.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 42 } })
    );
    expect(UserPayout.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 42 })
    );
    expect(UserCommission.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user_id: 42, status: 'pending' },
      })
    );
    expect(User.update).toHaveBeenCalledWith(expect.anything(), {
      where: { id: 42 },
    });
  });

  it('recusa requisição sem usuário no token', async () => {
    const res = createMockResponse();

    await UserPayoutsServices.requestPayout(
      createMockRequest({ params: {}, body: { userId: 999, amount: 150 } }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(User.findOne).not.toHaveBeenCalled();
    expect(createTransferAsaas).not.toHaveBeenCalled();
  });
});

describe('requestPayout: recusas antes de mover dinheiro', () => {
  const expectNothingChanged = () => {
    expect(createTransferAsaas).not.toHaveBeenCalled();
    expect(UserPayout.create).not.toHaveBeenCalled();
    expect(UserCommission.update).not.toHaveBeenCalled();
    expect(User.update).not.toHaveBeenCalled();
  };

  it('404 quando o usuário não existe', async () => {
    User.findOne.mockResolvedValue(null);
    const res = createMockResponse();

    await UserPayoutsServices.requestPayout(authedRequest({ amount: 150 }), res);

    expect(res.statusCode).toBe(404);
    expectNothingChanged();
  });

  it('400 e nada alterado quando o saldo é insuficiente', async () => {
    User.findOne.mockResolvedValue(userRow({ balance: '120.00' }));
    const res = createMockResponse();

    await UserPayoutsServices.requestPayout(authedRequest({ amount: 150 }), res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Saldo insuficiente para saque.',
    });
    expectNothingChanged();
  });

  it('400 quando o usuário não tem chave Pix cadastrada', async () => {
    User.findOne.mockResolvedValue(userRow({ chavePix: null }));
    const res = createMockResponse();

    await UserPayoutsServices.requestPayout(authedRequest({ amount: 150 }), res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe(
      'Cadastre uma chave Pix antes de solicitar o saque.'
    );
    expectNothingChanged();
  });

  it('400 quando já houve saque no mês corrente', async () => {
    User.findOne.mockResolvedValue(userRow({ lastPayout: new Date() }));
    const res = createMockResponse();

    await UserPayoutsServices.requestPayout(authedRequest({ amount: 150 }), res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Você já solicitou um saque este mês.');
    expectNothingChanged();
  });

  it('500 claro quando o Asaas não está configurado', async () => {
    delete process.env.ASAAS_API_KEY;
    const res = createMockResponse();

    await UserPayoutsServices.requestPayout(authedRequest({ amount: 150 }), res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Saque indisponível no momento',
    });
    expectNothingChanged();
  });
});

describe('requestPayout: falha do gateway', () => {
  it('400 com a mensagem do Asaas e nada alterado', async () => {
    createTransferAsaas.mockRejectedValue(
      new AsaasError('Saldo insuficiente na conta Asaas', { status: 400 })
    );
    const res = createMockResponse();

    await UserPayoutsServices.requestPayout(authedRequest({ amount: 150 }), res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Saldo insuficiente na conta Asaas',
    });
    expect(UserPayout.create).not.toHaveBeenCalled();
    expect(UserCommission.update).not.toHaveBeenCalled();
    expect(User.update).not.toHaveBeenCalled();
  });

  it('500 genérico em erro inesperado, sem vazar detalhe técnico', async () => {
    createTransferAsaas.mockRejectedValue(
      new Error('connect ETIMEDOUT 10.0.0.1:443')
    );
    const res = createMockResponse();

    await UserPayoutsServices.requestPayout(authedRequest({ amount: 150 }), res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Erro ao processar saque',
    });
    expect(User.update).not.toHaveBeenCalled();
  });
});

describe('choosePayoutMethod: cadastro da chave Pix', () => {
  it('grava a chave Pix do usuário autenticado', async () => {
    const res = createMockResponse();

    await UserPayoutsServices.choosePayoutMethod(
      createMockRequest({
        params: { userId: 42 },
        body: { userId: 999, pixKey: '  ana@example.com ' },
      }),
      res
    );

    expect(User.update).toHaveBeenCalledWith(
      { chavePix: 'ana@example.com' },
      { where: { id: 42 } }
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'Chave Pix atualizada.',
      data: { pixKey: 'ana@example.com' },
    });
  });

  it('400 quando a chave vem vazia', async () => {
    const res = createMockResponse();

    await UserPayoutsServices.choosePayoutMethod(
      authedRequest({ pixKey: '   ' }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(User.update).not.toHaveBeenCalled();
  });

  it('404 quando o usuário não existe', async () => {
    User.findOne.mockResolvedValue(null);
    const res = createMockResponse();

    await UserPayoutsServices.choosePayoutMethod(
      authedRequest({ pixKey: 'ana@example.com' }),
      res
    );

    expect(res.statusCode).toBe(404);
    expect(User.update).not.toHaveBeenCalled();
  });
});
