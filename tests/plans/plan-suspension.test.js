jest.mock('../../src/models', () => ({
  UserPlans: { findAll: jest.fn() },
  User: {},
  Plans: {},
}));

jest.mock('../../src/services/plans/plan-notifications', () => ({
  PLAN_NOTICE_KINDS: {
    PAST_DUE: 'past_due',
    SUSPENDED: 'suspended',
    EXPIRED: 'expired',
    CANCELED: 'canceled',
  },
  sendPlanNotice: jest.fn(),
}));

const {
  DEFAULT_GRACE_PERIOD_DAYS,
  resolveGracePeriodDays,
  shouldSuspendPastDue,
  shouldExpireCanceled,
  processPlanSuspensions,
} = require('../../src/services/plans/plan-suspension');
const { UserPlans } = require('../../src/models');
const { sendPlanNotice } = require('../../src/services/plans/plan-notifications');

const planRow = (overrides = {}) => ({
  user_id: 1,
  status: 'past_due',
  plan_canceled: false,
  plan_finish_at: null,
  updatedAt: new Date('2026-09-01T10:00:00'),
  user: { id: 1, name: 'Ana', email: 'ana@example.com' },
  plans: { id: 2, plan_name: 'Premium' },
  update: jest.fn(async function update(payload) {
    Object.assign(this, payload);
    return this;
  }),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.PLAN_GRACE_PERIOD_DAYS;
  sendPlanNotice.mockResolvedValue({ sent: true });
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

describe('resolveGracePeriodDays', () => {
  it('default é 5 dias', () => {
    expect(resolveGracePeriodDays()).toBe(DEFAULT_GRACE_PERIOD_DAYS);
    expect(DEFAULT_GRACE_PERIOD_DAYS).toBe(5);
  });

  it('aceita override por env, inclusive zero', () => {
    process.env.PLAN_GRACE_PERIOD_DAYS = '2';
    expect(resolveGracePeriodDays()).toBe(2);
    process.env.PLAN_GRACE_PERIOD_DAYS = '0';
    expect(resolveGracePeriodDays()).toBe(0);
  });

  it('valor inválido cai no default', () => {
    process.env.PLAN_GRACE_PERIOD_DAYS = 'abc';
    expect(resolveGracePeriodDays()).toBe(DEFAULT_GRACE_PERIOD_DAYS);
    process.env.PLAN_GRACE_PERIOD_DAYS = '-3';
    expect(resolveGracePeriodDays()).toBe(DEFAULT_GRACE_PERIOD_DAYS);
  });
});

describe('shouldSuspendPastDue', () => {
  it('dentro da tolerância não suspende', () => {
    const row = planRow();
    expect(shouldSuspendPastDue(row, new Date('2026-09-04T10:00:00'), 5)).toBe(
      false
    );
  });

  it('passada a tolerância suspende', () => {
    const row = planRow();
    expect(shouldSuspendPastDue(row, new Date('2026-09-06T10:00:00'), 5)).toBe(
      true
    );
  });

  it('só age sobre past_due', () => {
    expect(
      shouldSuspendPastDue(
        planRow({ status: 'active' }),
        new Date('2026-10-01'),
        5
      )
    ).toBe(false);
    expect(
      shouldSuspendPastDue(
        planRow({ status: 'suspended' }),
        new Date('2026-10-01'),
        5
      )
    ).toBe(false);
  });

  it('sem data de marcação não suspende', () => {
    expect(
      shouldSuspendPastDue(planRow({ updatedAt: null }), new Date(), 5)
    ).toBe(false);
  });
});

describe('shouldExpireCanceled', () => {
  it('cancelado ainda dentro do período pago mantém acesso', () => {
    const row = planRow({
      status: 'active',
      plan_canceled: true,
      plan_finish_at: new Date('2026-10-01'),
    });
    expect(shouldExpireCanceled(row, new Date('2026-09-15'))).toBe(false);
  });

  it('cancelado após o fim do período expira', () => {
    const row = planRow({
      status: 'active',
      plan_canceled: true,
      plan_finish_at: new Date('2026-09-10'),
    });
    expect(shouldExpireCanceled(row, new Date('2026-09-11'))).toBe(true);
  });

  it('não mexe em quem não cancelou nem em quem já expirou', () => {
    expect(
      shouldExpireCanceled(
        planRow({ plan_canceled: false, plan_finish_at: new Date('2020-01-01') }),
        new Date()
      )
    ).toBe(false);
    expect(
      shouldExpireCanceled(
        planRow({
          status: 'expired',
          plan_canceled: true,
          plan_finish_at: new Date('2020-01-01'),
        }),
        new Date()
      )
    ).toBe(false);
  });
});

describe('processPlanSuspensions', () => {
  it('suspende vencidos e expira cancelados, contando cada um', async () => {
    const toSuspend = planRow();
    const untouched = planRow({ updatedAt: new Date('2026-09-07T10:00:00') });
    const toExpire = planRow({
      status: 'active',
      plan_canceled: true,
      plan_finish_at: new Date('2026-09-01'),
    });

    UserPlans.findAll
      .mockResolvedValueOnce([toSuspend, untouched])
      .mockResolvedValueOnce([toExpire]);

    const result = await processPlanSuspensions(new Date('2026-09-08T10:00:00'));

    expect(result).toEqual({ suspended: 1, expired: 1, notified: 2 });
    expect(toSuspend.update).toHaveBeenCalledWith({ status: 'suspended' });
    expect(untouched.update).not.toHaveBeenCalled();
    expect(toExpire.update).toHaveBeenCalledWith({ status: 'expired' });
  });

  it('nada a fazer devolve zeros', async () => {
    UserPlans.findAll.mockResolvedValue([]);
    const result = await processPlanSuspensions(new Date());
    expect(result).toEqual({ suspended: 0, expired: 0, notified: 0 });
  });

  it('avisa o assinante em cada transição, com plano e usuário da linha', async () => {
    const toSuspend = planRow();
    const toExpire = planRow({
      user_id: 9,
      status: 'active',
      plan_canceled: true,
      plan_finish_at: new Date('2026-09-01'),
      user: { id: 9, name: 'Bruno', email: 'bruno@example.com' },
      plans: { id: 3, plan_name: 'Anual' },
    });

    UserPlans.findAll
      .mockResolvedValueOnce([toSuspend])
      .mockResolvedValueOnce([toExpire]);

    await processPlanSuspensions(new Date('2026-09-08T10:00:00'));

    expect(sendPlanNotice).toHaveBeenCalledTimes(2);
    expect(sendPlanNotice).toHaveBeenNthCalledWith(1, {
      kind: 'suspended',
      user: toSuspend.user,
      planName: 'Premium',
    });
    expect(sendPlanNotice).toHaveBeenNthCalledWith(2, {
      kind: 'expired',
      user: toExpire.user,
      planName: 'Anual',
    });
  });

  it('não avisa quem não mudou de status', async () => {
    const untouched = planRow({ updatedAt: new Date('2026-09-07T10:00:00') });
    UserPlans.findAll.mockResolvedValueOnce([untouched]).mockResolvedValueOnce([]);

    await processPlanSuspensions(new Date('2026-09-08T10:00:00'));

    expect(sendPlanNotice).not.toHaveBeenCalled();
  });

  it('falha de e-mail não impede a mudança de status nem para a varredura', async () => {
    const first = planRow();
    const second = planRow({ user_id: 2 });
    sendPlanNotice.mockRejectedValue(new Error('SMTP fora do ar'));

    UserPlans.findAll.mockResolvedValueOnce([first, second]).mockResolvedValueOnce([]);

    const result = await processPlanSuspensions(new Date('2026-09-08T10:00:00'));

    expect(result).toEqual({ suspended: 2, expired: 0, notified: 0 });
    expect(first.update).toHaveBeenCalledWith({ status: 'suspended' });
    expect(second.update).toHaveBeenCalledWith({ status: 'suspended' });
  });
});
