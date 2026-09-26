'use strict';

/**
 * Colunas que o código usa mas que faltavam no banco de produção (VM Oracle).
 *
 * O banco local veio de um dump que já tinha essas colunas; o de produção foi
 * criado só pelas migrations, e nenhuma migration as criava. Resultado em
 * 2026-09-26: `GET /user-plan-grouped/:id` (e qualquer `UserPlans.findAll`)
 * falhava com "Unknown column 'UserPlans.stripe_subscription_id'" logo após o
 * primeiro cadastro real no site.
 *
 * - user_plans.stripe_subscription_id  VARCHAR(255) NULL
 * - user_plans.scheduled_plan_id       INT NULL, FK -> plans.id (ON DELETE SET NULL)
 * - user_plans.scheduled_plan_start_at DATETIME NULL
 * - user_main_grid.activite            TINYINT(1) NOT NULL DEFAULT 0 (item desabilitado
 *   no catálogo; usado pelo painel admin e pela busca) + índices de catálogo que
 *   20260902140000 tentou criar e ignorou o erro porque a coluna não existia.
 *
 * Idempotente: pula coluna / FK / índice que já existe (bancos vindos de dump).
 */

const USER_PLANS = 'user_plans';
const GRID = 'user_main_grid';
const FK_SCHEDULED = 'user_plans_scheduled_plan_id_fk';
const GRID_INDEXES = [
  ['idx_umg_activite_created', ['activite', 'created_at']],
  ['idx_umg_activite_format', ['activite', 'format']],
  ['idx_umg_activite_availability', ['activite', 'availability']],
];

async function hasTable(queryInterface, table) {
  const tables = await queryInterface.showAllTables();
  return tables
    .map((t) => (typeof t === 'string' ? t : t.tableName || t.name || ''))
    .map((n) => String(n).toLowerCase())
    .includes(table);
}

async function addColumnIfMissing(queryInterface, table, column, spec) {
  const columns = await queryInterface.describeTable(table);
  if (columns[column]) return false;
  await queryInterface.addColumn(table, column, spec);
  return true;
}

async function removeColumnIfPresent(queryInterface, table, column) {
  const columns = await queryInterface.describeTable(table);
  if (columns[column]) await queryInterface.removeColumn(table, column);
}

async function indexNames(queryInterface, table) {
  const indexes = await queryInterface.showIndex(table);
  return new Set(indexes.map((i) => i.name || i.Key_name));
}

async function hasForeignKeyOn(queryInterface, table, column) {
  const refs = await queryInterface.getForeignKeyReferencesForTable(table);
  return refs.some((r) => r.columnName === column);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (await hasTable(queryInterface, USER_PLANS)) {
      await addColumnIfMissing(queryInterface, USER_PLANS, 'stripe_subscription_id', {
        type: Sequelize.STRING,
        allowNull: true,
        after: 'stripe_customer_id',
      });
      await addColumnIfMissing(queryInterface, USER_PLANS, 'scheduled_plan_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        after: 'subscription_days_left',
      });
      await addColumnIfMissing(queryInterface, USER_PLANS, 'scheduled_plan_start_at', {
        type: Sequelize.DATE,
        allowNull: true,
        after: 'scheduled_plan_id',
      });
      if (!(await hasForeignKeyOn(queryInterface, USER_PLANS, 'scheduled_plan_id'))) {
        await queryInterface.addConstraint(USER_PLANS, {
          fields: ['scheduled_plan_id'],
          type: 'foreign key',
          name: FK_SCHEDULED,
          references: { table: 'plans', field: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        });
      }
    }

    if (await hasTable(queryInterface, GRID)) {
      await addColumnIfMissing(queryInterface, GRID, 'activite', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        after: 'reason',
      });
      const existing = await indexNames(queryInterface, GRID);
      for (const [name, fields] of GRID_INDEXES) {
        if (!existing.has(name)) await queryInterface.addIndex(GRID, fields, { name });
      }
    }
  },

  async down(queryInterface) {
    if (await hasTable(queryInterface, GRID)) {
      const existing = await indexNames(queryInterface, GRID);
      for (const [name] of GRID_INDEXES) {
        if (existing.has(name)) await queryInterface.removeIndex(GRID, name);
      }
      await removeColumnIfPresent(queryInterface, GRID, 'activite');
    }

    if (await hasTable(queryInterface, USER_PLANS)) {
      const refs = await queryInterface.getForeignKeyReferencesForTable(USER_PLANS);
      for (const ref of refs.filter((r) => r.columnName === 'scheduled_plan_id')) {
        await queryInterface.removeConstraint(USER_PLANS, ref.constraintName);
      }
      for (const column of ['scheduled_plan_start_at', 'scheduled_plan_id', 'stripe_subscription_id']) {
        await removeColumnIfPresent(queryInterface, USER_PLANS, column);
      }
    }
  },
};