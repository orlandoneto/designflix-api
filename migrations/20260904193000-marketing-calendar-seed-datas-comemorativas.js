'use strict';

/**
 * Substitui a carga curta do calendário pela lista completa de Datas Comemorativas 2026.
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

    const rows = buildMarketingCalendarSeedRows(new Date());
    await queryInterface.bulkInsert('marketing_calendar_event', rows);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('marketing_calendar_event', null, {});
  },
};
