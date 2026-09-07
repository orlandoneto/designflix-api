'use strict';

/**
 * Campanhas de período (Setembro Amarelo, Outubro Rosa…) precisam de fim.
 * Após adicionar a coluna, regenera o catálogo do ano de referência.
 */

const {
  buildMarketingCalendarSeedRows,
  DEFAULT_SEED_YEAR,
} = require('../src/services/marketing-calendar/seed-datas-comemorativas');

const TABLE = 'marketing_calendar_event';

async function hasTable(queryInterface) {
  const tables = await queryInterface.showAllTables();
  return tables
    .map((t) => (typeof t === 'string' ? t : t.tableName || t.name || ''))
    .map((n) => String(n).toLowerCase())
    .includes(TABLE);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await hasTable(queryInterface))) return;

    const columns = await queryInterface.describeTable(TABLE);
    if (!columns.end_date) {
      await queryInterface.addColumn(TABLE, 'end_date', {
        type: Sequelize.DATEONLY,
        allowNull: true,
        after: 'event_date',
      });
    }

    await queryInterface.bulkDelete(TABLE, null, {});
    const rows = buildMarketingCalendarSeedRows(new Date(), DEFAULT_SEED_YEAR);
    if (rows.length) {
      await queryInterface.bulkInsert(TABLE, rows);
    }
  },

  async down(queryInterface) {
    if (!(await hasTable(queryInterface))) return;

    const columns = await queryInterface.describeTable(TABLE);
    if (columns.end_date) {
      await queryInterface.removeColumn(TABLE, 'end_date');
    }
  },
};
