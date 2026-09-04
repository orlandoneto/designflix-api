const { MarketingCalendarEvent } = require('../models');
const { ok, badRequest, notFound, serverError } = require('../utils/httpResponse');
const {
  mapCalendarEvent,
  validateCalendarBody,
} = require('./marketing-calendar/marketing-calendar-rules');

const ADMIN_LIST_DEFAULT_LIMIT = 10;
const ADMIN_LIST_MAX_LIMIT = 50;

function parseAdminListPagination(query = {}) {
  const pageRaw = query.page;
  const limitRaw = query.limit;

  if (pageRaw != null && String(pageRaw).trim() !== '') {
    const pageNum = Number(pageRaw);
    if (!Number.isInteger(pageNum) || pageNum < 1) {
      return { ok: false, message: 'Parâmetro page inválido' };
    }
  }
  if (limitRaw != null && String(limitRaw).trim() !== '') {
    const limitNum = Number(limitRaw);
    if (!Number.isInteger(limitNum) || limitNum < 1) {
      return { ok: false, message: 'Parâmetro limit inválido' };
    }
  }

  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(query.limit, 10) || ADMIN_LIST_DEFAULT_LIMIT, 1),
    ADMIN_LIST_MAX_LIMIT
  );
  return { ok: true, page, limit };
}

class MarketingCalendarService {
  /** Público — home / lista ativa */
  async listPublic(req, res) {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 8, 1), 120);
      const rows = await MarketingCalendarEvent.findAll({
        where: { active: true },
        order: [
          ['sortOrder', 'ASC'],
          ['eventDate', 'ASC'],
          ['id', 'ASC'],
        ],
        limit,
      });
      return ok(res, {
        message: 'Calendário carregado',
        data: rows.map(mapCalendarEvent),
        meta: { total: rows.length, limit },
      });
    } catch (err) {
      console.error('[marketing-calendar/listPublic]', err.message);
      return serverError(res, 'Erro ao carregar o calendário');
    }
  }

  /** Admin — lista paginada */
  async listAdmin(req, res) {
    try {
      const parsed = parseAdminListPagination(req.query || {});
      if (!parsed.ok) return badRequest(res, parsed.message);

      const { page, limit } = parsed;
      const activeOnly = String(req.query.active || '') === '1';
      const where = activeOnly ? { active: true } : {};
      const { count, rows } = await MarketingCalendarEvent.findAndCountAll({
        where,
        order: [
          ['sortOrder', 'ASC'],
          ['eventDate', 'ASC'],
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
        meta: { total, page, limit },
      });
    } catch (err) {
      console.error('[marketing-calendar/listAdmin]', err.message);
      return serverError(res, 'Erro ao listar eventos');
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
