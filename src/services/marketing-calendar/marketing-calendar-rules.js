/**
 * Regras do Calendário do Marketing (testável sem DB).
 *
 * Home: destaca datas/categorias **próximas** (janela from→to), não o calendário ano inteiro.
 * Catálogo: regras recorrentes em marketing-calendar-catalog.js → materialize por ano.
 */

const { relativeLabelForDate } = require('./marketing-calendar-date-math');

const PUBLIC_DEFAULT_LIMIT = 8;
const PUBLIC_MAX_LIMIT = 120;
/** Janela padrão ~1,5 mês (semana/mês de campanha). */
const PUBLIC_DEFAULT_DAYS_AHEAD = 45;
const PUBLIC_MAX_DAYS_AHEAD = 365;
const HOME_TZ = 'America/Sao_Paulo';
const ADMIN_LIST_DEFAULT_LIMIT = 10;
const ADMIN_LIST_MAX_LIMIT = 100;

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

function mapCalendarEvent(row, { todayIso } = {}) {
  if (!row) return null;
  const plain = typeof row.get === 'function' ? row.get({ plain: true }) : row;
  const eventDate = plain.eventDate || plain.event_date;
  const endDate = plain.endDate || plain.end_date || null;
  return {
    id: plain.id,
    title: plain.title,
    eventDate,
    endDate,
    icon: plain.icon || '📅',
    badge: plain.badge || null,
    relativeLabel: todayIso ? relativeLabelForDate(eventDate, todayIso, endDate) : null,
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
  let endDate =
    has('endDate') || has('end_date')
      ? String(source.endDate || source.end_date || '').trim() || null
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
  if (endDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      errors.push('endDate');
    } else if (eventDate && endDate < eventDate) {
      errors.push('endDate');
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
  if (endDate !== undefined) data.endDate = endDate;
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

/** Data de hoje (YYYY-MM-DD) no fuso da home BR. */
function todayIsoInHomeTz(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: HOME_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function addDaysIso(isoDate, days) {
  const raw = String(isoDate || '').slice(0, 10);
  const [y, m, d] = raw.split('-').map(Number);
  if (!y || !m || !d) return raw;
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + Number(days || 0));
  return dt.toISOString().slice(0, 10);
}

/**
 * Janela pública: hoje → hoje+daysAhead (inclusive).
 * @returns {{ ok: true, from: string, to: string, daysAhead: number, limit: number } | { ok: false, message: string }}
 */
function parsePublicListQuery(query = {}, { now = new Date() } = {}) {
  const q = query && typeof query === 'object' ? query : {};

  if (q.limit != null && String(q.limit).trim() !== '') {
    const limitNum = Number(q.limit);
    if (!Number.isInteger(limitNum) || limitNum < 1) {
      return { ok: false, message: 'Parâmetro limit inválido' };
    }
  }
  if (q.daysAhead != null && String(q.daysAhead).trim() !== '') {
    const daysNum = Number(q.daysAhead);
    if (!Number.isInteger(daysNum) || daysNum < 1) {
      return { ok: false, message: 'Parâmetro daysAhead inválido' };
    }
  }

  const limit = Math.min(
    Math.max(parseInt(q.limit, 10) || PUBLIC_DEFAULT_LIMIT, 1),
    PUBLIC_MAX_LIMIT
  );
  const daysAhead = Math.min(
    Math.max(parseInt(q.daysAhead, 10) || PUBLIC_DEFAULT_DAYS_AHEAD, 1),
    PUBLIC_MAX_DAYS_AHEAD
  );

  const from = todayIsoInHomeTz(now);
  const to = addDaysIso(from, daysAhead);
  return { ok: true, from, to, daysAhead, limit };
}

/**
 * Lista admin: paginação + filtro opcional year/month.
 */
function parseAdminListQuery(query = {}) {
  const q = query && typeof query === 'object' ? query : {};

  if (q.page != null && String(q.page).trim() !== '') {
    const pageNum = Number(q.page);
    if (!Number.isInteger(pageNum) || pageNum < 1) {
      return { ok: false, message: 'Parâmetro page inválido' };
    }
  }
  if (q.limit != null && String(q.limit).trim() !== '') {
    const limitNum = Number(q.limit);
    if (!Number.isInteger(limitNum) || limitNum < 1) {
      return { ok: false, message: 'Parâmetro limit inválido' };
    }
  }

  let year;
  if (q.year != null && String(q.year).trim() !== '') {
    year = Number(q.year);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return { ok: false, message: 'Parâmetro year inválido' };
    }
  }

  let month;
  if (q.month != null && String(q.month).trim() !== '') {
    month = Number(q.month);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return { ok: false, message: 'Parâmetro month inválido' };
    }
  }

  if (month != null && year == null) {
    return { ok: false, message: 'Informe year junto com month' };
  }

  const page = Math.max(parseInt(q.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(q.limit, 10) || ADMIN_LIST_DEFAULT_LIMIT, 1),
    ADMIN_LIST_MAX_LIMIT
  );

  return { ok: true, page, limit, year: year || null, month: month || null };
}

function parseRegenerateBody(body = {}) {
  const source = body && typeof body === 'object' ? body : {};
  const yearRaw = source.year != null ? Number(source.year) : new Date().getFullYear();
  if (!Number.isInteger(yearRaw) || yearRaw < 2000 || yearRaw > 2100) {
    return { ok: false, message: 'Ano inválido (use 2000–2100)' };
  }
  return { ok: true, year: yearRaw };
}

/** Intervalo DATEONLY para filtro year[/month]. */
function adminDateRangeFilter(year, month) {
  if (!year) return null;
  if (month) {
    const m = String(month).padStart(2, '0');
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return {
      from: `${year}-${m}-01`,
      to: `${year}-${m}-${String(last).padStart(2, '0')}`,
    };
  }
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

module.exports = {
  PUBLIC_DEFAULT_LIMIT,
  PUBLIC_MAX_LIMIT,
  PUBLIC_DEFAULT_DAYS_AHEAD,
  PUBLIC_MAX_DAYS_AHEAD,
  ADMIN_LIST_DEFAULT_LIMIT,
  ADMIN_LIST_MAX_LIMIT,
  slugifyCategory,
  mapCalendarEvent,
  formatEventDateBr,
  validateCalendarBody,
  todayIsoInHomeTz,
  addDaysIso,
  parsePublicListQuery,
  parseAdminListQuery,
  parseRegenerateBody,
  adminDateRangeFilter,
};
