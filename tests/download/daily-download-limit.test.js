const {
  DEFAULT_FREE_DAILY_LIMIT,
  PLAN_STATUS,
  isEntitledPlanStatus,
  isFreeMeteredPlan,
  resolveDailyLimit,
  shouldResetDailyLimit,
  resolveMonthlyPeriod,
  getDailyDownloadQuota,
  assertAndConsumeDailyDownload,
} = require('../../src/services/download/daily-download-limit');

jest.mock('../../src/models', () => ({
  User: { findByPk: jest.fn() },
  UserPlans: { findOne: jest.fn() },
  Plans: {},
  PlansDownloadLimits: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

const { User, UserPlans, PlansDownloadLimits } = require('../../src/models');

describe('daily-download-limit helpers', () => {
  it('DEFAULT_FREE_DAILY_LIMIT é 3', () => {
    expect(DEFAULT_FREE_DAILY_LIMIT).toBe(3);
  });

  it('isFreeMeteredPlan reconhece free', () => {
    expect(isFreeMeteredPlan('free')).toBe(true);
    expect(isFreeMeteredPlan('free_1_downloads')).toBe(true);
    expect(isFreeMeteredPlan('Gratuito')).toBe(true);
    expect(isFreeMeteredPlan('')).toBe(true);
    expect(isFreeMeteredPlan('monthly')).toBe(false);
    expect(isFreeMeteredPlan('5_downloads')).toBe(false);
  });

  it('resolveDailyLimit: pago = null (ilimitado), free usa count ou 3', () => {
    expect(resolveDailyLimit({ plan_name: 'monthly', count_downloads: 5 })).toBeNull();
    expect(resolveDailyLimit({ plan_name: 'free', count_downloads: 3 })).toBe(3);
    expect(resolveDailyLimit({ plan_name: 'free', count_downloads: 1 })).toBe(1);
    expect(resolveDailyLimit({ plan_name: 'free', count_downloads: 0 })).toBe(3);
    expect(resolveDailyLimit(null)).toBe(3);
  });

  it('isEntitledPlanStatus: ativo e atrasado mantêm acesso; suspenso não', () => {
    expect(isEntitledPlanStatus(PLAN_STATUS.ACTIVE)).toBe(true);
    // past_due é a janela de tolerância — quem corta é o job de suspensão.
    expect(isEntitledPlanStatus(PLAN_STATUS.PAST_DUE)).toBe(true);
    expect(isEntitledPlanStatus(PLAN_STATUS.SUSPENDED)).toBe(false);
    expect(isEntitledPlanStatus(PLAN_STATUS.CANCELED)).toBe(false);
    expect(isEntitledPlanStatus(PLAN_STATUS.EXPIRED)).toBe(false);
    expect(isEntitledPlanStatus('ACTIVE')).toBe(true);
  });

  it('isEntitledPlanStatus: status ausente mantém comportamento antigo', () => {
    expect(isEntitledPlanStatus(null)).toBe(true);
    expect(isEntitledPlanStatus(undefined)).toBe(true);
    expect(isEntitledPlanStatus('')).toBe(true);
  });

  it('resolveDailyLimit: plano pago suspenso cai na régua do free', () => {
    const paidPlan = { plan_name: 'monthly', count_downloads: 50 };
    expect(resolveDailyLimit(paidPlan, PLAN_STATUS.ACTIVE)).toBeNull();
    expect(resolveDailyLimit(paidPlan, PLAN_STATUS.PAST_DUE)).toBeNull();
    // Não herda o count_downloads alto do plano pago.
    expect(resolveDailyLimit(paidPlan, PLAN_STATUS.SUSPENDED)).toBe(
      DEFAULT_FREE_DAILY_LIMIT
    );
    expect(resolveDailyLimit(paidPlan, PLAN_STATUS.CANCELED)).toBe(
      DEFAULT_FREE_DAILY_LIMIT
    );
  });

  it('shouldResetDailyLimit após meia-noite seguinte', () => {
    const last = new Date('2026-09-07T10:00:00');
    const sameDay = new Date('2026-09-07T23:00:00');
    const nextDay = new Date('2026-09-08T00:00:01');
    expect(shouldResetDailyLimit(last, sameDay)).toBe(false);
    expect(shouldResetDailyLimit(last, nextDay)).toBe(true);
    expect(shouldResetDailyLimit(null, nextDay)).toBe(false);
  });
});

describe('assertAndConsumeDailyDownload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('400 userId inválido', async () => {
    const result = await assertAndConsumeDailyDownload(0);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });

  it('partner bypass sem consumir', async () => {
    User.findByPk.mockResolvedValue({ id: 9, partnerCode: 'ABC' });
    const result = await assertAndConsumeDailyDownload(9);
    expect(result.ok).toBe(true);
    expect(result.data.unlimited).toBe(true);
    expect(result.data.skipped_reason).toBe('partner');
    expect(PlansDownloadLimits.findOne).not.toHaveBeenCalled();
  });

  it('plano pago bypass', async () => {
    User.findByPk.mockResolvedValue({ id: 2, partnerCode: null });
    UserPlans.findOne.mockResolvedValue({
      plans: { plan_name: 'monthly', count_downloads: 5 },
    });
    const result = await assertAndConsumeDailyDownload(2);
    expect(result.ok).toBe(true);
    expect(result.data.unlimited).toBe(true);
    expect(result.data.skipped_reason).toBe('paid_plan');
  });

  it('plano pago atrasado ainda passa (tolerância)', async () => {
    User.findByPk.mockResolvedValue({ id: 21, partnerCode: null });
    UserPlans.findOne.mockResolvedValue({
      status: PLAN_STATUS.PAST_DUE,
      plans: { plan_name: 'monthly', count_downloads: 5 },
    });

    const result = await assertAndConsumeDailyDownload(21);
    expect(result.ok).toBe(true);
    expect(result.data.unlimited).toBe(true);
    expect(result.data.plan_status).toBe(PLAN_STATUS.PAST_DUE);
    expect(PlansDownloadLimits.findOne).not.toHaveBeenCalled();
  });

  it('plano pago suspenso perde o ilimitado e passa a ser medido', async () => {
    User.findByPk.mockResolvedValue({ id: 22, partnerCode: null });
    UserPlans.findOne.mockResolvedValue({
      status: PLAN_STATUS.SUSPENDED,
      plans: { plan_name: 'monthly', count_downloads: 50 },
    });
    PlansDownloadLimits.findOne.mockResolvedValue(null);
    PlansDownloadLimits.create.mockResolvedValue({
      current_count_downloads: 1,
    });

    const result = await assertAndConsumeDailyDownload(22);
    expect(result.ok).toBe(true);
    expect(result.data.unlimited).toBe(false);
    expect(result.data.limit).toBe(DEFAULT_FREE_DAILY_LIMIT);
    expect(result.data.plan_status).toBe(PLAN_STATUS.SUSPENDED);
    expect(PlansDownloadLimits.create).toHaveBeenCalled();
  });

  it('plano pago suspenso é bloqueado ao estourar a régua free', async () => {
    User.findByPk.mockResolvedValue({ id: 23, partnerCode: null });
    UserPlans.findOne.mockResolvedValue({
      status: PLAN_STATUS.SUSPENDED,
      plans: { plan_name: 'monthly', count_downloads: 50 },
    });
    PlansDownloadLimits.findOne.mockResolvedValue({
      current_count_downloads: DEFAULT_FREE_DAILY_LIMIT,
      updatedAt: new Date(),
      update: jest.fn(),
      destroy: jest.fn(),
    });

    const result = await assertAndConsumeDailyDownload(23);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.data.plan_status).toBe(PLAN_STATUS.SUSPENDED);
  });

  it('free: incrementa e libera', async () => {
    User.findByPk.mockResolvedValue({ id: 3, partnerCode: null });
    UserPlans.findOne.mockResolvedValue({
      plans: { plan_name: 'free', count_downloads: 3 },
    });
    const row = {
      current_count_downloads: 1,
      updatedAt: new Date(),
      update: jest.fn(async function update(payload) {
        this.current_count_downloads = payload.current_count_downloads;
        return this;
      }),
      destroy: jest.fn(),
    };
    PlansDownloadLimits.findOne.mockResolvedValue(row);

    const result = await assertAndConsumeDailyDownload(3);
    expect(result.ok).toBe(true);
    expect(result.data.used).toBe(2);
    expect(result.data.limit).toBe(3);
    expect(result.data.remaining).toBe(1);
    expect(row.update).toHaveBeenCalled();
  });

  it('free: bloqueia no limite', async () => {
    User.findByPk.mockResolvedValue({ id: 4, partnerCode: null });
    UserPlans.findOne.mockResolvedValue({
      plans: { plan_name: 'free', count_downloads: 3 },
    });
    PlansDownloadLimits.findOne.mockResolvedValue({
      current_count_downloads: 3,
      updatedAt: new Date(),
      update: jest.fn(),
      destroy: jest.fn(),
    });

    const result = await assertAndConsumeDailyDownload(4);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toMatch(/limite de downloads diários/i);
    expect(result.data.used).toBe(3);
    expect(result.data.remaining).toBe(0);
  });

  it('free: cria contador na primeira vez', async () => {
    User.findByPk.mockResolvedValue({ id: 5, partnerCode: null });
    UserPlans.findOne.mockResolvedValue(null);
    PlansDownloadLimits.findOne.mockResolvedValue(null);
    PlansDownloadLimits.create.mockResolvedValue({
      current_count_downloads: 1,
    });

    const result = await assertAndConsumeDailyDownload(5);
    expect(result.ok).toBe(true);
    expect(result.data.used).toBe(1);
    expect(result.data.limit).toBe(3);
    expect(PlansDownloadLimits.create).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 5, current_count_downloads: 1 })
    );
  });
});

describe('teto mensal do plano pago', () => {
  const paidPlanWithCap = {
    plan_name: 'monthly',
    count_downloads: 0,
    monthly_download_cap: 90,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    User.findByPk.mockResolvedValue({ id: 31, partnerCode: null });
    UserPlans.findOne.mockResolvedValue({
      status: PLAN_STATUS.ACTIVE,
      plans: paidPlanWithCap,
    });
  });

  it('conta no mês em vez do dia', async () => {
    const row = {
      current_count_downloads: 0,
      monthly_count_downloads: 10,
      monthly_period: resolveMonthlyPeriod(new Date()),
      updatedAt: new Date(),
      update: jest.fn(async function update(payload) {
        Object.assign(this, payload);
        return this;
      }),
    };
    PlansDownloadLimits.findOne.mockResolvedValue(row);

    const result = await assertAndConsumeDailyDownload(31);
    expect(result.ok).toBe(true);
    expect(result.data.unlimited).toBe(false);
    expect(result.data.period).toBe('month');
    expect(result.data.used).toBe(11);
    expect(result.data.limit).toBe(90);
    expect(result.data.remaining).toBe(79);
  });

  it('bloqueia ao atingir o teto, sem mexer no contador', async () => {
    const row = {
      current_count_downloads: 0,
      monthly_count_downloads: 90,
      monthly_period: resolveMonthlyPeriod(new Date()),
      updatedAt: new Date(),
      update: jest.fn(),
    };
    PlansDownloadLimits.findOne.mockResolvedValue(row);

    const result = await assertAndConsumeDailyDownload(31);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toMatch(/limite de downloads do seu plano neste mês/i);
    expect(result.data.remaining).toBe(0);
    expect(row.update).not.toHaveBeenCalled();
  });

  it('contador de outro mês vale zero', async () => {
    const row = {
      current_count_downloads: 0,
      monthly_count_downloads: 90,
      monthly_period: '2020-01',
      updatedAt: new Date(),
      update: jest.fn(async function update(payload) {
        Object.assign(this, payload);
        return this;
      }),
    };
    PlansDownloadLimits.findOne.mockResolvedValue(row);

    const result = await assertAndConsumeDailyDownload(31);
    expect(result.ok).toBe(true);
    expect(result.data.used).toBe(1);
    expect(row.update).toHaveBeenCalledWith(
      expect.objectContaining({
        monthly_count_downloads: 1,
        monthly_period: resolveMonthlyPeriod(new Date()),
      })
    );
  });

  it('plano pago sem teto continua ilimitado e não toca o contador', async () => {
    UserPlans.findOne.mockResolvedValue({
      status: PLAN_STATUS.ACTIVE,
      plans: { plan_name: 'monthly', count_downloads: 0 },
    });

    const result = await assertAndConsumeDailyDownload(31);
    expect(result.ok).toBe(true);
    expect(result.data.unlimited).toBe(true);
    expect(result.data.period).toBeNull();
    expect(PlansDownloadLimits.findOne).not.toHaveBeenCalled();
  });

  it('cria a linha na primeira cobrança do mês sem zerar o diário', async () => {
    PlansDownloadLimits.findOne.mockResolvedValue(null);
    PlansDownloadLimits.create.mockResolvedValue({});

    const result = await assertAndConsumeDailyDownload(31);
    expect(result.ok).toBe(true);
    expect(PlansDownloadLimits.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 31,
        current_count_downloads: 0,
        monthly_count_downloads: 1,
      })
    );
  });

  it('quota mensal é lida sem consumir', async () => {
    PlansDownloadLimits.findOne.mockResolvedValue({
      current_count_downloads: 0,
      monthly_count_downloads: 12,
      monthly_period: resolveMonthlyPeriod(new Date()),
      updatedAt: new Date(),
      update: jest.fn(),
    });

    const result = await getDailyDownloadQuota(31);
    expect(result.data.used).toBe(12);
    expect(result.data.limit).toBe(90);
    expect(result.data.period).toBe('month');
    expect(PlansDownloadLimits.create).not.toHaveBeenCalled();
  });
});

describe('reset diário preserva o contador mensal', () => {
  it('zera o diário em vez de apagar a linha', async () => {
    jest.clearAllMocks();
    User.findByPk.mockResolvedValue({ id: 32, partnerCode: null });
    UserPlans.findOne.mockResolvedValue({
      plans: { plan_name: 'free', count_downloads: 3 },
    });
    const row = {
      current_count_downloads: 3,
      monthly_count_downloads: 40,
      monthly_period: resolveMonthlyPeriod(new Date()),
      updatedAt: new Date('2020-01-01T10:00:00'),
      update: jest.fn(async function update(payload) {
        Object.assign(this, payload);
        return this;
      }),
      destroy: jest.fn(),
    };
    PlansDownloadLimits.findOne.mockResolvedValue(row);

    const result = await assertAndConsumeDailyDownload(32);
    expect(result.ok).toBe(true);
    expect(result.data.used).toBe(1);
    expect(row.destroy).not.toHaveBeenCalled();
    expect(row.monthly_count_downloads).toBe(40);
  });
});

describe('getDailyDownloadQuota', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retorna used/limit sem consumir', async () => {
    User.findByPk.mockResolvedValue({ id: 7, partnerCode: null });
    UserPlans.findOne.mockResolvedValue({
      plans: { plan_name: 'free', count_downloads: 3 },
    });
    PlansDownloadLimits.findOne.mockResolvedValue({
      current_count_downloads: 2,
      updatedAt: new Date(),
      destroy: jest.fn(),
    });

    const result = await getDailyDownloadQuota(7);
    expect(result.ok).toBe(true);
    expect(result.data.used).toBe(2);
    expect(result.data.remaining).toBe(1);
    expect(PlansDownloadLimits.create).not.toHaveBeenCalled();
  });
});
