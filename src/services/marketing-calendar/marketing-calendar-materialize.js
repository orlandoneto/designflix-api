'use strict';

/**
 * Materializa o catálogo recorrente em linhas DATEONLY para um ano.
 */

const { MARKETING_CALENDAR_CATALOG } = require('./marketing-calendar-catalog');
const { resolveTemplateRange } = require('./marketing-calendar-date-math');
const { slugifyCategory } = require('./marketing-calendar-rules');

/**
 * @param {number} year
 * @param {Date} [now]
 */
function materializeCatalogYear(year, now = new Date()) {
  const y = Number(year);
  if (!Number.isInteger(y) || y < 2000 || y > 2100) {
    throw new Error('Ano inválido para materializar o calendário');
  }

  const resolved = [];
  for (const item of MARKETING_CALENDAR_CATALOG) {
    const range = resolveTemplateRange(item, y);
    if (!range) continue;
    resolved.push({
      title: item.title,
      eventDate: range.eventDate,
      endDate: range.endDate,
      icon: item.icon || '📅',
      badge: item.badge ?? null,
      categorySlug: slugifyCategory(item.title),
    });
  }

  resolved.sort((a, b) => a.eventDate.localeCompare(b.eventDate) || a.title.localeCompare(b.title));

  return resolved.map((row, index) => ({
    title: row.title,
    event_date: row.eventDate,
    end_date: row.endDate,
    icon: row.icon,
    badge: row.badge,
    category_slug: row.categorySlug,
    sort_order: (index + 1) * 10,
    active: true,
    created_at: now,
    updated_at: now,
  }));
}

/** Lista leve (título + datas) para testes / preview. */
function previewCatalogYear(year) {
  return materializeCatalogYear(year).map((row) => ({
    title: row.title,
    eventDate: row.event_date,
    endDate: row.end_date,
    categorySlug: row.category_slug,
    icon: row.icon,
    badge: row.badge,
  }));
}

module.exports = {
  materializeCatalogYear,
  previewCatalogYear,
};
