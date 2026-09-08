'use strict';

/**
 * Teto mensal de downloads no plano pago.
 *
 * O plano pago hoje é ilimitado, e a R$ 0,30 de comissão por download um plano
 * de R$ 29 fica negativo por volta de 97 downloads/mês de um único assinante.
 *
 * 1. `plans.monthly_download_cap` — nulo = ilimitado (comportamento atual).
 * 2. `plans_download_limits` ganha contador mensal com a janela (`YYYY-MM`)
 *    ao lado do contador diário que já existia. Sem a janela gravada não dá
 *    para saber se o número é do mês corrente ou de um mês antigo.
 *
 * @see docs/contextos/plans.md
 */

const PLANS_TABLE = 'plans';
const LIMITS_TABLE = 'plans_download_limits';

async function hasTable(queryInterface, table) {
  const tables = await queryInterface.showAllTables();
  return tables
    .map((t) => (typeof t === 'string' ? t : t.tableName || t.name || ''))
    .map((n) => String(n).toLowerCase())
    .includes(table);
}

async function addColumnIfMissing(queryInterface, table, column, spec) {
  const columns = await queryInterface.describeTable(table);
  if (!columns[column]) {
    await queryInterface.addColumn(table, column, spec);
  }
}

async function removeColumnIfPresent(queryInterface, table, column) {
  const columns = await queryInterface.describeTable(table);
  if (columns[column]) {
    await queryInterface.removeColumn(table, column);
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (await hasTable(queryInterface, PLANS_TABLE)) {
      await addColumnIfMissing(
        queryInterface,
        PLANS_TABLE,
        'monthly_download_cap',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          after: 'count_downloads',
        }
      );
    }

    if (await hasTable(queryInterface, LIMITS_TABLE)) {
      await addColumnIfMissing(
        queryInterface,
        LIMITS_TABLE,
        'monthly_count_downloads',
        {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          after: 'current_count_downloads',
        }
      );
      await addColumnIfMissing(queryInterface, LIMITS_TABLE, 'monthly_period', {
        type: Sequelize.STRING(7),
        allowNull: true,
        after: 'monthly_count_downloads',
      });
    }
  },

  async down(queryInterface) {
    if (await hasTable(queryInterface, LIMITS_TABLE)) {
      await removeColumnIfPresent(queryInterface, LIMITS_TABLE, 'monthly_period');
      await removeColumnIfPresent(
        queryInterface,
        LIMITS_TABLE,
        'monthly_count_downloads'
      );
    }

    if (await hasTable(queryInterface, PLANS_TABLE)) {
      await removeColumnIfPresent(
        queryInterface,
        PLANS_TABLE,
        'monthly_download_cap'
      );
    }
  },
};
