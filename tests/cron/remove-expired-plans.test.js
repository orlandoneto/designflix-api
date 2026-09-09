jest.mock('../../src/models', () => ({
  UserPlans: { findAll: jest.fn() },
  Plans: {},
  User: {},
  Sequelize: { Op: { lte: Symbol('lte'), or: Symbol('or') } },
}));

jest.mock('../../src/utils/emailService', () => ({ sendEmail: jest.fn() }));

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
}));

jest.mock('node-cron', () => ({ schedule: jest.fn() }));

const {
  processExpiredPlans,
  isLegacyProviderPlan,
} = require('../../src/cron/removeStripeExpiredPlansJob');
const { UserPlans } = require('../../src/models');
const { sendEmail } = require('../../src/utils/emailService');

const expiredRow = (overrides = {}) => ({
  id: 10,
  user_id: 1,
  provider: 'stripe',
  plan_finish_at: new Date('2026-01-01T00:00:00Z'),
  user: { id: 1, name: 'Ana', email: 'ana@example.com' },
  plans: { id: 2, plan_name: 'pro_mensal' },
  destroy: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  sendEmail.mockResolvedValue({ sent: true });
});

describe('isLegacyProviderPlan', () => {
  it('trata Stripe, MercadoPago e linha sem provider como legado', () => {
    expect(isLegacyProviderPlan('stripe')).toBe(true);
    expect(isLegacyProviderPlan('mercadopago')).toBe(true);
    expect(isLegacyProviderPlan(null)).toBe(true);
    expect(isLegacyProviderPlan(undefined)).toBe(true);
    expect(isLegacyProviderPlan('   ')).toBe(true);
  });

  it('não trata Asaas como legado, em qualquer capitalização', () => {
    expect(isLegacyProviderPlan('asaas')).toBe(false);
    expect(isLegacyProviderPlan('ASAAS')).toBe(false);
    expect(isLegacyProviderPlan(' Asaas ')).toBe(false);
  });
});

describe('processExpiredPlans', () => {
  it('apaga a linha do legado e avisa o assinante', async () => {
    const row = expiredRow();
    UserPlans.findAll.mockResolvedValue([row]);

    await processExpiredPlans();

    expect(row.destroy).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('não apaga nem avisa assinante Asaas — quem expira é o plan-suspension', async () => {
    const row = expiredRow({ provider: 'asaas' });
    UserPlans.findAll.mockResolvedValue([row]);

    await processExpiredPlans();

    expect(row.destroy).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('processa o legado mesmo quando há Asaas na mesma varredura', async () => {
    const legacy = expiredRow({ id: 11, provider: null });
    const asaas = expiredRow({ id: 12, provider: 'asaas' });
    UserPlans.findAll.mockResolvedValue([asaas, legacy]);

    await processExpiredPlans();

    expect(asaas.destroy).not.toHaveBeenCalled();
    expect(legacy.destroy).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});
