/**
 * Regras do Calendário do Marketing (testável sem DB).
 */

function slugifyCategory(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function mapCalendarEvent(row) {
  if (!row) return null;
  const plain = typeof row.get === 'function' ? row.get({ plain: true }) : row;
  return {
    id: plain.id,
    title: plain.title,
    eventDate: plain.eventDate || plain.event_date,
    icon: plain.icon || '📅',
    badge: plain.badge || null,
    categorySlug: plain.categorySlug || plain.category_slug,
    sortOrder: Number(plain.sortOrder ?? plain.sort_order ?? 0),
    active: plain.active !== false && plain.active !== 0,
    createdAt: plain.createdAt || plain.created_at || null,
    updatedAt: plain.updatedAt || plain.updated_at || null,
  };
}

function formatEventDateBr(isoDate) {
  if (!isoDate) return '';
  const raw = String(isoDate).slice(0, 10);
  const [y, m, d] = raw.split('-');
  if (!y || !m || !d) return raw;
  return `${d}/${m}/${y}`;
}

function validateCalendarBody(body, { partial = false } = {}) {
  const source = body && typeof body === 'object' ? body : {};
  const errors = [];

  const has = (key) => Object.prototype.hasOwnProperty.call(source, key);

  let title = has('title') ? String(source.title || '').trim() : undefined;
  let eventDate = has('eventDate') || has('event_date')
    ? String(source.eventDate || source.event_date || '').trim()
    : undefined;
  let icon = has('icon') ? String(source.icon || '').trim() || '📅' : undefined;
  let badge =
    has('badge') || has('label')
      ? String(source.badge || source.label || '').trim() || null
      : undefined;
  let categorySlug =
    has('categorySlug') || has('category_slug')
      ? slugifyCategory(source.categorySlug || source.category_slug)
      : undefined;
  let sortOrder =
    has('sortOrder') || has('sort_order')
      ? Number(source.sortOrder ?? source.sort_order)
      : undefined;
  let active = has('active') ? Boolean(source.active) : undefined;

  if (!partial || has('title')) {
    if (!title) errors.push('title');
  }
  if (!partial || has('eventDate') || has('event_date')) {
    if (!eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
      errors.push('eventDate');
    }
  }
  if (!partial || has('categorySlug') || has('category_slug')) {
    if (!categorySlug) {
      // deriva do título se ainda não veio
      if (title) categorySlug = slugifyCategory(title);
      if (!categorySlug) errors.push('categorySlug');
    }
  }

  if (sortOrder !== undefined && Number.isNaN(sortOrder)) {
    errors.push('sortOrder');
  }

  if (errors.length) {
    return {
      ok: false,
      message: `Campos inválidos: ${errors.join(', ')}. Use eventDate YYYY-MM-DD e categorySlug.`,
    };
  }

  const data = {};
  if (title !== undefined) data.title = title;
  if (eventDate !== undefined) data.eventDate = eventDate;
  if (icon !== undefined) data.icon = icon;
  if (badge !== undefined) data.badge = badge;
  if (categorySlug !== undefined) data.categorySlug = categorySlug;
  if (sortOrder !== undefined) data.sortOrder = sortOrder;
  if (active !== undefined) data.active = active;

  if (partial && Object.keys(data).length === 0) {
    return { ok: false, message: 'Nenhum campo válido para atualizar' };
  }

  return { ok: true, data };
}

module.exports = {
  slugifyCategory,
  mapCalendarEvent,
  formatEventDateBr,
  validateCalendarBody,
};
