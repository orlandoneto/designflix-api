const migration = require('../../migrations/20260926150000-user-plans-and-grid-missing-columns');

const Sequelize = { STRING: 'STRING', INTEGER: 'INTEGER', DATE: 'DATE', BOOLEAN: 'BOOLEAN' };

/** queryInterface falso: `schema` = { tabela: [colunas] }, `fks`, `indexes`. */
function fakeQI({ schema, fks = [], indexes = {} }) {
  const cols = Object.fromEntries(Object.entries(schema).map(([t, c]) => [t, new Set(c)]));
  const idx = Object.fromEntries(Object.keys(schema).map((t) => [t, new Set(indexes[t] || [])]));
  const fkList = [...fks];
  return {
    showAllTables: jest.fn(async () => Object.keys(schema)),
    describeTable: jest.fn(async (t) => Object.fromEntries([...cols[t]].map((c) => [c, {}]))),
    addColumn: jest.fn(async (t, c) => cols[t].add(c)),
    removeColumn: jest.fn(async (t, c) => cols[t].delete(c)),
    showIndex: jest.fn(async (t) => [...idx[t]].map((name) => ({ name }))),
    addIndex: jest.fn(async (t, f, { name }) => idx[t].add(name)),
    removeIndex: jest.fn(async (t, name) => idx[t].delete(name)),
    getForeignKeyReferencesForTable: jest.fn(async () => fkList),
    addConstraint: jest.fn(async (t, opts) => fkList.push({ columnName: opts.fields[0], constraintName: opts.name })),
    removeConstraint: jest.fn(async () => {}),
    cols,
    idx,
  };
}

const PROD_USER_PLANS = ['id', 'user_id', 'plan_id', 'status', 'provider', 'stripe_customer_id', 'mercadopago_customer_id',
  'subscription_days_left', 'plan_finish_at', 'cron_executed', 'plan_canceled', 'created_at', 'updated_at'];
const PROD_GRID = ['id', 'name', 'format', 'reason', 'availability', 'created_at', 'updated_at'];

describe('migration 20260926150000-user-plans-and-grid-missing-columns', () => {
  it('produção: adiciona as 3 colunas de user_plans, FK de scheduled_plan_id, activite e índices', async () => {
    const qi = fakeQI({ schema: { user_plans: PROD_USER_PLANS, user_main_grid: PROD_GRID, plans: ['id'] },
      fks: [{ columnName: 'plan_id', constraintName: 'user_plans_ibfk_1' }] });
    await migration.up(qi, Sequelize);

    const added = qi.addColumn.mock.calls.map(([t, c]) => `${t}.${c}`);
    expect(added).toEqual([
      'user_plans.stripe_subscription_id',
      'user_plans.scheduled_plan_id',
      'user_plans.scheduled_plan_start_at',
      'user_main_grid.activite',
    ]);
    const spec = Object.fromEntries(qi.addColumn.mock.calls.map(([, c, s]) => [c, s]));
    expect(spec.stripe_subscription_id).toMatchObject({ type: 'STRING', allowNull: true });
    expect(spec.scheduled_plan_id).toMatchObject({ type: 'INTEGER', allowNull: true });
    expect(spec.scheduled_plan_start_at).toMatchObject({ type: 'DATE', allowNull: true });
    expect(spec.activite).toMatchObject({ type: 'BOOLEAN', allowNull: false, defaultValue: false });

    expect(qi.addConstraint).toHaveBeenCalledWith('user_plans', expect.objectContaining({
      fields: ['scheduled_plan_id'],
      type: 'foreign key',
      references: { table: 'plans', field: 'id' },
      onDelete: 'SET NULL',
    }));
    expect([...qi.idx.user_main_grid]).toEqual([
      'idx_umg_activite_created', 'idx_umg_activite_format', 'idx_umg_activite_availability',
    ]);
  });

  it('banco completo (dump): não altera nada', async () => {
    const qi = fakeQI({
      schema: {
        user_plans: [...PROD_USER_PLANS, 'stripe_subscription_id', 'scheduled_plan_id', 'scheduled_plan_start_at'],
        user_main_grid: [...PROD_GRID, 'activite'],
      },
      fks: [{ columnName: 'scheduled_plan_id', constraintName: 'user_plans_ibfk_3' }],
      indexes: { user_main_grid: ['idx_umg_activite_created', 'idx_umg_activite_format', 'idx_umg_activite_availability'] },
    });
    await migration.up(qi, Sequelize);
    expect(qi.addColumn).not.toHaveBeenCalled();
    expect(qi.addConstraint).not.toHaveBeenCalled();
    expect(qi.addIndex).not.toHaveBeenCalled();
  });

  it('rodar duas vezes é seguro', async () => {
    const qi = fakeQI({ schema: { user_plans: PROD_USER_PLANS, user_main_grid: PROD_GRID } });
    await migration.up(qi, Sequelize);
    const calls = qi.addColumn.mock.calls.length;
    await migration.up(qi, Sequelize);
    expect(qi.addColumn.mock.calls.length).toBe(calls);
    expect(qi.addConstraint).toHaveBeenCalledTimes(1);
  });

  it('down remove FK, índices e colunas', async () => {
    const qi = fakeQI({ schema: { user_plans: PROD_USER_PLANS, user_main_grid: PROD_GRID } });
    await migration.up(qi, Sequelize);
    await migration.down(qi, Sequelize);
    expect(qi.removeConstraint).toHaveBeenCalledWith('user_plans', 'user_plans_scheduled_plan_id_fk');
    expect(qi.cols.user_plans.has('scheduled_plan_id')).toBe(false);
    expect(qi.cols.user_plans.has('stripe_subscription_id')).toBe(false);
    expect(qi.cols.user_main_grid.has('activite')).toBe(false);
    expect(qi.idx.user_main_grid.size).toBe(0);
  });

  it('cobre todas as colunas dos models UserPlans e UserMainGrid que faltavam', () => {
    const define = (name, attrs) => ({ name, attrs });
    const types = new Proxy({}, { get: () => Object.assign(() => ({}), { UNSIGNED: {} }) });
    const fields = (m) => Object.entries(m.attrs).map(([k, v]) => v.field || k);
    const up = fields(require('../../src/models/user_plans')({ define }, types));
    const grid = fields(require('../../src/models/user_main_grid')({ define }, types));
    for (const c of ['stripe_subscription_id', 'scheduled_plan_id', 'scheduled_plan_start_at']) expect(up).toContain(c);
    expect(grid).toContain('activite');
  });
});