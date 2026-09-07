'use strict';

/**
 * Regenera marketing_calendar_event a partir do catálogo recorrente (ano 2026).
 * Só grava colunas que já existem — `end_date` chega na migration seguinte.
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
  async up(queryInterface) {
    if (!(await hasTable(queryInterface))) return;

    const columns = await queryInterface.describeTable(TABLE);
    const rows = buildMarketingCalendarSeedRows(new Date(), DEFAULT_SEED_YEAR).map(
      (row) =>
        Object.fromEntries(
          Object.entries(row).filter(([column]) => Boolean(columns[column]))
        )
    );

    await queryInterface.bulkDelete(TABLE, null, {});
    if (rows.length) {
      await queryInterface.bulkInsert(TABLE, rows);
    }
  },

  async down(queryInterface) {
    if (!(await hasTable(queryInterface))) return;
    await queryInterface.bulkDelete(TABLE, null, {});
  },
};
