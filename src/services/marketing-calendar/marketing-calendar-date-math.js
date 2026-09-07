'use strict';

/**
 * Matemática de datas do Calendário do Marketing (testável sem DB).
 * Fuso de referência das datas materializadas: calendário civil (UTC date parts).
 */

function pad2(n) {
  return String(n).padStart(2, '0');
}

function isoDate(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Domingo de Páscoa (algoritmo gregoriano Anônimo / Meeus). */
function easterSunday(year) {
  const y = Number(year);
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { year: y, month, day };
}

function addDaysIso(iso, days) {
  const raw = String(iso || '').slice(0, 10);
  const [y, m, d] = raw.split('-').map(Number);
  if (!y || !m || !d) return raw;
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + Number(days || 0));
  return isoDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/**
 * N-ésimo dia da semana no mês.
 * @param {number} weekday 0=domingo … 6=sábado (JS)
 * @param {number} nth 1..5 ou -1 (último)
 */
function nthWeekdayOfMonth(year, month, weekday, nth) {
  const y = Number(year);
  const m = Number(month);
  const wd = Number(weekday);
  const n = Number(nth);

  if (n === -1) {
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    for (let day = lastDay; day >= 1; day -= 1) {
      const dt = new Date(Date.UTC(y, m - 1, day));
      if (dt.getUTCDay() === wd) return isoDate(y, m, day);
    }
    return null;
  }

  let count = 0;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  for (let day = 1; day <= lastDay; day += 1) {
    const dt = new Date(Date.UTC(y, m - 1, day));
    if (dt.getUTCDay() === wd) {
      count += 1;
      if (count === n) return isoDate(y, m, day);
    }
  }
  return null;
}

function lastDayOfMonth(year, month) {
  return new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
}

/**
 * Resolve template → YYYY-MM-DD (início da campanha).
 */
function resolveTemplateDate(template, year) {
  const y = Number(year);
  const rule = template.rule;

  if (rule === 'fixed') {
    return isoDate(y, template.month, template.day);
  }
  if (rule === 'month_start' || rule === 'month_span') {
    return isoDate(y, template.month, 1);
  }
  if (rule === 'nth_weekday') {
    return nthWeekdayOfMonth(y, template.month, template.weekday, template.nth);
  }
  if (rule === 'easter_offset') {
    const easter = easterSunday(y);
    const base = isoDate(easter.year, easter.month, easter.day);
    return addDaysIso(base, template.easterOffset || 0);
  }
  return null;
}

/**
 * Resolve template → { eventDate, endDate }.
 * `endDate` só existe em campanha de período (mês inteiro ou `durationDays`).
 */
function resolveTemplateRange(template, year) {
  const eventDate = resolveTemplateDate(template, year);
  if (!eventDate) return null;

  if (template.rule === 'month_span' || template.rule === 'month_start') {
    const y = Number(year);
    const month = Number(template.month);
    return {
      eventDate,
      endDate: isoDate(y, month, lastDayOfMonth(y, month)),
    };
  }
  if (Number(template.durationDays) > 1) {
    return {
      eventDate,
      endDate: addDaysIso(eventDate, Number(template.durationDays) - 1),
    };
  }
  return { eventDate, endDate: null };
}

/**
 * Selo relativo estilo concorrente (HOJE / Amanhã / Próximos dias).
 * Campanha de período em andamento (hoje entre início e fim) também é HOJE.
 */
function relativeLabelForDate(eventDate, todayIso, endDate = null) {
  const event = String(eventDate || '').slice(0, 10);
  const today = String(todayIso || '').slice(0, 10);
  const end = endDate ? String(endDate).slice(0, 10) : null;
  if (!event || !today) return null;

  if (end && event <= today && today <= end) return 'HOJE';
  if (event < today) return null;

  const [ey, em, ed] = event.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  const eventMs = Date.UTC(ey, em - 1, ed);
  const todayMs = Date.UTC(ty, tm - 1, td);
  const diffDays = Math.round((eventMs - todayMs) / 86400000);

  if (diffDays === 0) return 'HOJE';
  if (diffDays === 1) return 'Amanhã';
  if (diffDays <= 7) return 'Próximos dias';
  return null;
}

module.exports = {
  pad2,
  isoDate,
  easterSunday,
  addDaysIso,
  lastDayOfMonth,
  nthWeekdayOfMonth,
  resolveTemplateDate,
  resolveTemplateRange,
  relativeLabelForDate,
};
