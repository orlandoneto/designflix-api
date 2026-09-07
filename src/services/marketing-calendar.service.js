const { Op } = require('sequelize');
const { MarketingCalendarEvent } = require('../models');
const { ok, badRequest, notFound, serverError } = require('../utils/httpResponse');
const {
  mapCalendarEvent,
  validateCalendarBody,
  parsePublicListQuery,
  parseAdminListQuery,
  parseRegenerateBody,
  adminDateRangeFilter,
} = require('./marketing-calendar/marketing-calendar-rules');
const {
  materializeCatalogYear,
} = require('./marketing-calendar/marketing-calendar-materialize');
const { MARKETING_CALENDAR_CATALOG } = require('./marketing-calendar/marketing-calendar-catalog');

class MarketingCalendarService {
  /**
   * Público — home: só datas **próximas** (hoje → +daysAhead).
   * Inclui relativeLabel (HOJE / Amanhã / Próximos dias) estilo concorrente.
   */
  async listPublic(req, res) {
    try {
      const parsed = parsePublicListQuery(req.query || {});
      if (!parsed.ok) return badRequest(res, parsed.message);

      const { limit, from, to, daysAhead } = parsed;
      const rows = await MarketingCalendarEvent.findAll({
        where: {
          active: true,
          [Op.or]: [
            // datas que começam dentro da janela
            { eventDate: { [Op.between]: [from, to] } },
            // campanhas de período já em andamento (ex.: Setembro Amarelo)
            {
              eventDate: { [Op.lt]: from },
              endDate: { [Op.gte]: from },
            },
          ],
        },
        order: [
          ['eventDate', 'ASC'],
          ['sortOrder', 'ASC'],
          ['id', 'ASC'],
        ],
        limit,
      });
      return ok(res, {
        message: 'Calendário carregado',
        data: rows.map((row) => mapCalendarEvent(row, { todayIso: from })),
        meta: { total: rows.length, limit, from, to, daysAhead },
      });
    } catch (err) {
      console.error('[marketing-calendar/listPublic]', err.message);
      return serverError(res, 'Erro ao carregar o calendário');
    }
  }

  /** Admin — lista paginada (filtro year/month opcional) */
  async listAdmin(req, res) {
    try {
      const parsed = parseAdminListQuery(req.query || {});
      if (!parsed.ok) return badRequest(res, parsed.message);

      const { page, limit, year, month } = parsed;
      const activeOnly = String(req.query.active || '') === '1';
      const where = activeOnly ? { active: true } : {};

      const range = adminDateRangeFilter(year, month);
      if (range) {
        where.eventDate = { [Op.between]: [range.from, range.to] };
      }

      const { count, rows } = await MarketingCalendarEvent.findAndCountAll({
        where,
        order: [
          ['eventDate', 'ASC'],
          ['sortOrder', 'ASC'],
          ['id', 'ASC'],
        ],
        limit,
        offset: (page - 1) * limit,
      });

      const total = count;
      const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

      return ok(res, {
        message: 'Eventos listados',
        data: rows.map(mapCalendarEvent),
        pagination: { page, limit, total, totalPages },
        meta: { total, page, limit, year, month },
      });
    } catch (err) {
      console.error('[marketing-calendar/listAdmin]', err.message);
      return serverError(res, 'Erro ao listar eventos');
    }
  }

  /**
   * Admin — regenera o ano a partir do catálogo recorrente (substitui toda a tabela).
   * Body: { year: 2026 }
   */
  async regenerate(req, res) {
    try {
      const parsed = parseRegenerateBody(req.body || {});
      if (!parsed.ok) return badRequest(res, parsed.message);

      const { year } = parsed;
      const seedRows = materializeCatalogYear(year);
      const payload = seedRows.map((row) => ({
        title: row.title,
        eventDate: row.event_date,
        endDate: row.end_date,
        icon: row.icon,
        badge: row.badge,
        categorySlug: row.category_slug,
        sortOrder: row.sort_order,
        active: true,
      }));

      await MarketingCalendarEvent.destroy({ where: {} });
      await MarketingCalendarEvent.bulkCreate(payload);

      return ok(res, {
        message: `Catálogo regenerado para ${year}`,
        data: {
          year,
          total: payload.length,
          catalogSize: MARKETING_CALENDAR_CATALOG.length,
        },
        meta: { year, total: payload.length },
      });
    } catch (err) {
      console.error('[marketing-calendar/regenerate]', err.message);
      return serverError(res, 'Erro ao regenerar o calendário');
    }
  }

  async create(req, res) {
    try {
      const parsed = validateCalendarBody(req.body, { partial: false });
      if (!parsed.ok) return badRequest(res, parsed.message);

      const created = await MarketingCalendarEvent.create({
        ...parsed.data,
        active: parsed.data.active !== false,
        sortOrder: parsed.data.sortOrder ?? 0,
        icon: parsed.data.icon || '📅',
      });

      return ok(res, {
        message: 'Evento criado',
        data: mapCalendarEvent(created),
      });
    } catch (err) {
      console.error('[marketing-calendar/create]', err.message);
      return serverError(res, 'Erro ao criar evento');
    }
  }

  async update(req, res) {
    try {
      const id = Number(req.params.id);
      if (!id) return badRequest(res, 'id inválido');

      const row = await MarketingCalendarEvent.findByPk(id);
      if (!row) return notFound(res, 'Evento não encontrado');

      const parsed = validateCalendarBody(req.body, { partial: true });
      if (!parsed.ok) return badRequest(res, parsed.message);

      await row.update(parsed.data);
      return ok(res, {
        message: 'Evento atualizado',
        data: mapCalendarEvent(row),
      });
    } catch (err) {
      console.error('[marketing-calendar/update]', err.message);
      return serverError(res, 'Erro ao atualizar evento');
    }
  }

  async remove(req, res) {
    try {
      const id = Number(req.params.id);
      if (!id) return badRequest(res, 'id inválido');

      const row = await MarketingCalendarEvent.findByPk(id);
      if (!row) return notFound(res, 'Evento não encontrado');

      await row.destroy();
      return ok(res, {
        message: 'Evento removido',
        data: { id },
      });
    } catch (err) {
      console.error('[marketing-calendar/remove]', err.message);
      return serverError(res, 'Erro ao remover evento');
    }
  }
}

module.exports = new MarketingCalendarService();
