'use strict';

/**
 * Carga canônica — Datas Comemorativas (calendário do marketing / designer).
 * Fonte: catálogo recorrente materializado por ano (default 2026).
 * Clique → Explorer ?niche={category_slug}.
 */

const { MARKETING_CALENDAR_CATALOG } = require('./marketing-calendar-catalog');
const { materializeCatalogYear, previewCatalogYear } = require('./marketing-calendar-materialize');

const DEFAULT_SEED_YEAR = 2026;

/** @deprecated Prefer previewCatalogYear(year) — mantido para testes legados. */
const DATAS_COMEMORATIVAS_2026 = previewCatalogYear(DEFAULT_SEED_YEAR).map((row) => ({
  title: row.title,
  eventDate: row.eventDate,
  icon: row.icon,
  badge: row.badge,
}));

function buildMarketingCalendarSeedRows(now = new Date(), year = DEFAULT_SEED_YEAR) {
  return materializeCatalogYear(year, now);
}

module.exports = {
  DEFAULT_SEED_YEAR,
  DATAS_COMEMORATIVAS_2026,
  MARKETING_CALENDAR_CATALOG,
  buildMarketingCalendarSeedRows,
  materializeCatalogYear,
  previewCatalogYear,
};
