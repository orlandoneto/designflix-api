const {
  DEFAULT_FREE_DAILY_LIMIT,
  isFreeMeteredPlan,
  resolveDailyLimit,
  shouldResetDailyLimit,
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
