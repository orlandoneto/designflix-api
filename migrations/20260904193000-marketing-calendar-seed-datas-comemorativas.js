'use strict';

/**
 * Substitui a carga curta do calendário pela lista completa de Datas Comemorativas 2026.
 * Filtra colunas inexistentes (ex.: end_date só entra em migration posterior).
 */
const {
  buildMarketingCalendarSeedRows,
} = require('../src/services/marketing-calendar/seed-datas-comemorativas');

module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables();
    const names = tables
      .map((t) => (typeof t === 'string' ? t : t.tableName || t.name || ''))
      .map((n) => String(n).toLowerCase());

    if (!names.includes('marketing_calendar_event')) {
      return;
    }

    await queryInterface.bulkDelete('marketing_calendar_event', null, {});

    const columns = await queryInterface.describeTable('marketing_calendar_event');
    const rows = buildMarketingCalendarSeedRows(new Date())
      .map((row) => {
        const filtered = {};
        for (const [key, value] of Object.entries(row)) {
          if (columns[key] !== undefined) {
            filtered[key] = value;
          }
        }
        return filtered;
      })
      .filter((row) => Object.keys(row).length > 0);

    if (rows.length) {
      await queryInterface.bulkInsert('marketing_calendar_event', rows);
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('marketing_calendar_event', null, {});
  },
};
