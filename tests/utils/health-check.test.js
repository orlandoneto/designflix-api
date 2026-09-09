const {
  DEPENDENCY_STATUS,
  checkDatabase,
  checkCache,
  inspectHealth,
} = require('../../src/utils/healthCheck');

const upSequelize = () => ({ authenticate: jest.fn().mockResolvedValue(undefined) });
const downSequelize = (message = 'ECONNREFUSED') => ({
  authenticate: jest.fn().mockRejectedValue(new Error(message)),
});

describe('checkDatabase', () => {
  it('está up quando o authenticate passa', async () => {
    await expect(checkDatabase(upSequelize())).resolves.toEqual({
      status: DEPENDENCY_STATUS.UP,
    });
  });

  it('está down e guarda o motivo quando o authenticate falha', async () => {
    const result = await checkDatabase(downSequelize('Access denied'));
    expect(result.status).toBe(DEPENDENCY_STATUS.DOWN);
    expect(result.reason).toBe('Access denied');
  });
});

describe('checkCache', () => {
  it('só considera up o status ready do ioredis', () => {
    expect(checkCache({ status: 'ready' }).status).toBe(DEPENDENCY_STATUS.UP);
    expect(checkCache({ status: 'connecting' }).status).toBe(DEPENDENCY_STATUS.DOWN);
    expect(checkCache({ status: 'end' }).status).toBe(DEPENDENCY_STATUS.DOWN);
  });

  it('não estoura quando não há cliente', () => {
    expect(checkCache(undefined).status).toBe(DEPENDENCY_STATUS.DOWN);
    expect(checkCache(null).status).toBe(DEPENDENCY_STATUS.DOWN);
  });
});

describe('inspectHealth', () => {
  it('banco up e cache up: saudável e sem degradação', async () => {
    const report = await inspectHealth({
      sequelize: upSequelize(),
      redis: { status: 'ready' },
    });

    expect(report.healthy).toBe(true);
    expect(report.degraded).toBe(false);
  });

  it('cache fora degrada mas não derruba — a API serve sem Redis', async () => {
    const report = await inspectHealth({
      sequelize: upSequelize(),
      redis: { status: 'end' },
    });

    expect(report.healthy).toBe(true);
    expect(report.degraded).toBe(true);
  });

  it('banco fora deixa de ser saudável', async () => {
    const report = await inspectHealth({
      sequelize: downSequelize(),
      redis: { status: 'ready' },
    });

    expect(report.healthy).toBe(false);
    expect(report.checks.database.status).toBe(DEPENDENCY_STATUS.DOWN);
  });
});
