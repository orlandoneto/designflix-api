const {
  slugifyCategory,
  mapCalendarEvent,
  formatEventDateBr,
  validateCalendarBody,
  parsePublicListQuery,
  parseAdminListQuery,
  parseRegenerateBody,
  addDaysIso,
} = require('../../src/services/marketing-calendar/marketing-calendar-rules');
const {
  easterSunday,
  nthWeekdayOfMonth,
  resolveTemplateDate,
  resolveTemplateRange,
  relativeLabelForDate,
} = require('../../src/services/marketing-calendar/marketing-calendar-date-math');
const {
  MARKETING_CALENDAR_CATALOG,
} = require('../../src/services/marketing-calendar/marketing-calendar-catalog');
const {
  previewCatalogYear,
} = require('../../src/services/marketing-calendar/marketing-calendar-materialize');
const { createMockRequest, createMockResponse } = require('../helpers/mockResponse');

jest.mock('../../src/models', () => ({
  MarketingCalendarEvent: {
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
    bulkCreate: jest.fn(),
  },
}));

const { MarketingCalendarEvent } = require('../../src/models');
const MarketingCalendarService = require('../../src/services/marketing-calendar.service');

describe('marketing-calendar-date-math', () => {
  it('easterSunday 2026 = 5 de abril', () => {
    expect(easterSunday(2026)).toEqual({ year: 2026, month: 4, day: 5 });
  });

  it('Carnaval 2026 = Páscoa - 47 (17/02)', () => {
    expect(resolveTemplateDate({ rule: 'easter_offset', easterOffset: -47 }, 2026)).toBe(
      '2026-02-17'
    );
  });

  it('Dia das Mães 2026 = 2º domingo de maio', () => {
    expect(nthWeekdayOfMonth(2026, 5, 0, 2)).toBe('2026-05-10');
  });

  it('Dia dos Pais BR 2026 = 2º domingo de agosto', () => {
    expect(nthWeekdayOfMonth(2026, 8, 0, 2)).toBe('2026-08-09');
  });

  it('Black Friday 2026 = 4ª sexta de novembro', () => {
    expect(nthWeekdayOfMonth(2026, 11, 5, 4)).toBe('2026-11-27');
  });

  it('relativeLabelForDate', () => {
    expect(relativeLabelForDate('2026-09-07', '2026-09-07')).toBe('HOJE');
    expect(relativeLabelForDate('2026-09-08', '2026-09-07')).toBe('Amanhã');
    expect(relativeLabelForDate('2026-09-10', '2026-09-07')).toBe('Próximos dias');
    expect(relativeLabelForDate('2026-10-01', '2026-09-07')).toBeNull();
  });

  it('campanha de mês em andamento é HOJE', () => {
    expect(relativeLabelForDate('2026-09-01', '2026-09-07', '2026-09-30')).toBe('HOJE');
    expect(relativeLabelForDate('2026-09-01', '2026-10-05', '2026-09-30')).toBeNull();
  });

  it('resolveTemplateRange fecha o mês da campanha', () => {
    expect(resolveTemplateRange({ rule: 'month_span', month: 9 }, 2026)).toEqual({
      eventDate: '2026-09-01',
      endDate: '2026-09-30',
    });
    expect(
      resolveTemplateRange({ rule: 'fixed', month: 12, day: 25 }, 2026)
    ).toEqual({ eventDate: '2026-12-25', endDate: null });
  });
});

describe('marketing-calendar-catalog / materialize', () => {
  it('catálogo cobre o ano (estilo concorrente)', () => {
    expect(MARKETING_CALENDAR_CATALOG.length).toBeGreaterThanOrEqual(80);
  });

  it('materializa 2026 com datas móveis corretas', () => {
    const rows = previewCatalogYear(2026);
    expect(rows.length).toBe(MARKETING_CALENDAR_CATALOG.length);

    const byTitle = Object.fromEntries(rows.map((r) => [r.title, r]));
    expect(byTitle.Carnaval.eventDate).toBe('2026-02-17');
    expect(byTitle['Dia das Mães'].eventDate).toBe('2026-05-10');
    expect(byTitle['Dia dos Pais'].eventDate).toBe('2026-08-09');
    expect(byTitle['Black Friday'].eventDate).toBe('2026-11-27');
    expect(byTitle.Natal.eventDate).toBe('2026-12-25');

    // campanhas de mês têm período fechado
    expect(byTitle['Setembro Amarelo'].eventDate).toBe('2026-09-01');
    expect(byTitle['Setembro Amarelo'].endDate).toBe('2026-09-30');
    expect(byTitle['Outubro Rosa'].endDate).toBe('2026-10-31');
    expect(byTitle.Natal.endDate).toBeNull();
  });

  it('seed buildMarketingCalendarSeedRows gera category_slug', () => {
    const {
      buildMarketingCalendarSeedRows,
    } = require('../../src/services/marketing-calendar/seed-datas-comemorativas');
    const rows = buildMarketingCalendarSeedRows();
    expect(rows[0].event_date <= rows[rows.length - 1].event_date).toBe(true);
    const pais = rows.find((r) => r.title === 'Dia dos Pais');
    expect(pais.category_slug).toBe('dia-dos-pais');
  });
});

describe('marketing-calendar-rules', () => {
  it('slugifyCategory normaliza acentos e espaços', () => {
    expect(slugifyCategory('Dia dos Pais')).toBe('dia-dos-pais');
    expect(slugifyCategory('Setembro Amarelo!')).toBe('setembro-amarelo');
  });

  it('formatEventDateBr', () => {
    expect(formatEventDateBr('2026-08-09')).toBe('09/08/2026');
  });

  it('mapCalendarEvent inclui categorySlug e relativeLabel', () => {
    const mapped = mapCalendarEvent(
      {
        id: 2,
        title: 'Independência do Brasil',
        event_date: '2026-09-07',
        icon: '🇧🇷',
        badge: null,
        category_slug: 'independencia-do-brasil',
        sort_order: 20,
        active: true,
      },
      { todayIso: '2026-09-07' }
    );
    expect(mapped.categorySlug).toBe('independencia-do-brasil');
    expect(mapped.relativeLabel).toBe('HOJE');
  });

  it('validateCalendarBody rejeita endDate antes do início', () => {
    const bad = validateCalendarBody({
      title: 'Setembro Amarelo',
      eventDate: '2026-09-01',
      endDate: '2026-08-30',
    });
    expect(bad.ok).toBe(false);

    const good = validateCalendarBody({
      title: 'Setembro Amarelo',
      eventDate: '2026-09-01',
      endDate: '2026-09-30',
    });
    expect(good.ok).toBe(true);
    expect(good.data.endDate).toBe('2026-09-30');
  });

  it('validateCalendarBody exige eventDate ISO', () => {
    const bad = validateCalendarBody({ title: 'X', eventDate: '09/08/2026' });
    expect(bad.ok).toBe(false);

    const good = validateCalendarBody({
      title: 'Dia dos Pais',
      eventDate: '2026-08-09',
      categorySlug: 'dia-dos-pais',
    });
    expect(good.ok).toBe(true);
    expect(good.data.categorySlug).toBe('dia-dos-pais');
  });

  it('parsePublicListQuery monta janela hoje→+daysAhead', () => {
    const parsed = parsePublicListQuery(
      { limit: '8', daysAhead: '30' },
      { now: new Date('2026-09-07T15:00:00-03:00') }
    );
    expect(parsed.ok).toBe(true);
    expect(parsed.from).toBe('2026-09-07');
    expect(parsed.to).toBe(addDaysIso('2026-09-07', 30));
  });

  it('parseAdminListQuery valida year/month', () => {
    expect(parseAdminListQuery({ year: '2026', month: '9', limit: '20' })).toEqual(
      expect.objectContaining({ ok: true, year: 2026, month: 9, limit: 20 })
    );
    expect(parseAdminListQuery({ month: '9' }).ok).toBe(false);
  });

  it('parseRegenerateBody', () => {
    expect(parseRegenerateBody({ year: 2026 })).toEqual({ ok: true, year: 2026 });
    expect(parseRegenerateBody({ year: 1999 }).ok).toBe(false);
  });
});

describe('MarketingCalendarService HTTP', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET público 200 com relativeLabel', async () => {
    MarketingCalendarEvent.findAll.mockResolvedValue([
      {
        get: () => ({
          id: 2,
          title: 'Independência do Brasil',
          eventDate: '2026-09-07',
          icon: '🇧🇷',
          badge: null,
          categorySlug: 'independencia-do-brasil',
          sortOrder: 40,
          active: true,
        }),
      },
    ]);

    const req = createMockRequest({ query: { limit: '8', daysAhead: '45' } });
    const res = createMockResponse();
    await MarketingCalendarService.listPublic(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data[0].categorySlug).toBe('independencia-do-brasil');
    expect(res.body.meta).toEqual(
      expect.objectContaining({ limit: 8, daysAhead: 45 })
    );
  });

  it('GET público inclui campanha de período em andamento', async () => {
    MarketingCalendarEvent.findAll.mockResolvedValue([]);

    const req = createMockRequest({ query: {} });
    const res = createMockResponse();
    await MarketingCalendarService.listPublic(req, res);

    const { Op } = require('sequelize');
    const where = MarketingCalendarEvent.findAll.mock.calls[0][0].where;
    const orBranches = where[Op.or];
    expect(orBranches).toHaveLength(2);
    expect(orBranches[1]).toHaveProperty('endDate');
  });

  it('POST regenerate substitui tabela pelo catálogo do ano', async () => {
    MarketingCalendarEvent.destroy.mockResolvedValue(1);
    MarketingCalendarEvent.bulkCreate.mockResolvedValue([]);

    const req = createMockRequest({ body: { year: 2026 } });
    const res = createMockResponse();
    await MarketingCalendarService.regenerate(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.year).toBe(2026);
    expect(res.body.data.total).toBeGreaterThanOrEqual(80);
    expect(MarketingCalendarEvent.destroy).toHaveBeenCalledWith({ where: {} });
    expect(MarketingCalendarEvent.bulkCreate).toHaveBeenCalled();
    const created = MarketingCalendarEvent.bulkCreate.mock.calls[0][0];
    expect(created.some((r) => r.title === 'Black Friday')).toBe(true);
    expect(
      created.find((r) => r.title === 'Setembro Amarelo')?.endDate
    ).toBe('2026-09-30');
  });

  it('GET admin 200 com paginação', async () => {
    MarketingCalendarEvent.findAndCountAll.mockResolvedValue({
      count: 47,
      rows: [
        {
          get: () => ({
            id: 1,
            title: 'Dia Internacional do Obrigado',
            eventDate: '2026-01-11',
            icon: '🙏',
            badge: null,
            categorySlug: 'dia-internacional-do-obrigado',
            sortOrder: 0,
            active: true,
          }),
        },
      ],
    });

    const req = createMockRequest({ query: { page: '2', limit: '10' } });
    const res = createMockResponse();
    await MarketingCalendarService.listAdmin(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 47,
      totalPages: 5,
    });
  });

  it('GET admin 400 se page inválido', async () => {
    const req = createMockRequest({ query: { page: '0' } });
    const res = createMockResponse();
    await MarketingCalendarService.listAdmin(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(MarketingCalendarEvent.findAndCountAll).not.toHaveBeenCalled();
  });

  it('POST admin cria evento', async () => {
    MarketingCalendarEvent.create.mockImplementation(async (payload) => ({
      get: () => ({ id: 99, ...payload }),
    }));

    const req = createMockRequest({
      body: {
        title: 'Black Friday',
        eventDate: '2026-11-27',
        categorySlug: 'black-friday',
        icon: '🖤',
      },
    });
    const res = createMockResponse();
    await MarketingCalendarService.create(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.data.categorySlug).toBe('black-friday');
  });

  it('PUT admin 404 se não existe', async () => {
    MarketingCalendarEvent.findByPk.mockResolvedValue(null);
    const req = createMockRequest({ params: { id: '9' }, body: { title: 'X' } });
    const res = createMockResponse();
    await MarketingCalendarService.update(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
