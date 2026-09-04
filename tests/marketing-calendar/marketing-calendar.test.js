const {
  slugifyCategory,
  mapCalendarEvent,
  formatEventDateBr,
  validateCalendarBody,
} = require('../../src/services/marketing-calendar/marketing-calendar-rules');
const { createMockRequest, createMockResponse } = require('../helpers/mockResponse');

jest.mock('../../src/models', () => ({
  MarketingCalendarEvent: {
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
}));

const { MarketingCalendarEvent } = require('../../src/models');
const MarketingCalendarService = require('../../src/services/marketing-calendar.service');

describe('marketing-calendar-rules', () => {
  it('slugifyCategory normaliza acentos e espaços', () => {
    expect(slugifyCategory('Dia dos Pais')).toBe('dia-dos-pais');
    expect(slugifyCategory('Setembro Amarelo!')).toBe('setembro-amarelo');
  });

  it('formatEventDateBr', () => {
    expect(formatEventDateBr('2026-08-09')).toBe('09/08/2026');
  });

  it('mapCalendarEvent inclui categorySlug para o Explorer', () => {
    const mapped = mapCalendarEvent({
      id: 2,
      title: 'Dia dos Pais',
      event_date: '2026-08-09',
      icon: '👨‍👧‍👦',
      badge: 'Mais buscado',
      category_slug: 'dia-dos-pais',
      sort_order: 20,
      active: true,
    });
    expect(mapped.categorySlug).toBe('dia-dos-pais');
    expect(mapped.badge).toBe('Mais buscado');
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

  it('validateCalendarBody deriva slug do título', () => {
    const parsed = validateCalendarBody({
      title: 'Outubro Rosa',
      eventDate: '2026-10-01',
    });
    expect(parsed.ok).toBe(true);
    expect(parsed.data.categorySlug).toBe('outubro-rosa');
  });
});

describe('seed datas comemorativas', () => {
  const {
    DATAS_COMEMORATIVAS_2026,
    buildMarketingCalendarSeedRows,
  } = require('../../src/services/marketing-calendar/seed-datas-comemorativas');

  it('tem a carga completa de datas 2026', () => {
    expect(DATAS_COMEMORATIVAS_2026.length).toBeGreaterThanOrEqual(45);
    expect(DATAS_COMEMORATIVAS_2026.some((d) => d.title === 'Dia dos Pais')).toBe(
      true
    );
    expect(DATAS_COMEMORATIVAS_2026.some((d) => d.title === 'Black Friday')).toBe(
      true
    );
    expect(
      DATAS_COMEMORATIVAS_2026.some((d) => d.title === 'Copa do Mundo Brasil 2026')
    ).toBe(true);
  });

  it('buildMarketingCalendarSeedRows ordena por data e gera slug', () => {
    const rows = buildMarketingCalendarSeedRows();
    expect(rows[0].event_date <= rows[rows.length - 1].event_date).toBe(true);
    const pais = rows.find((r) => r.title === 'Dia dos Pais');
    expect(pais.category_slug).toBe('dia-dos-pais');
    expect(pais.icon).toBe('👨‍👧‍👦');
  });
});

describe('MarketingCalendarService HTTP', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET público 200 envelope', async () => {
    MarketingCalendarEvent.findAll.mockResolvedValue([
      {
        get: () => ({
          id: 2,
          title: 'Dia dos Pais',
          eventDate: '2026-08-09',
          icon: '👨‍👧‍👦',
          badge: 'Mais buscado',
          categorySlug: 'dia-dos-pais',
          sortOrder: 20,
          active: true,
        }),
      },
    ]);

    const req = createMockRequest({ query: { limit: '8' } });
    const res = createMockResponse();
    await MarketingCalendarService.listPublic(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data[0].categorySlug).toBe('dia-dos-pais');
    expect(res.body.message).toBe('Calendário carregado');
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
    expect(res.body.success).toBe(true);
    expect(MarketingCalendarEvent.create).toHaveBeenCalled();
    expect(res.body.data.categorySlug).toBe('black-friday');
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
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Eventos listados');
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 47,
      totalPages: 5,
    });
    expect(MarketingCalendarEvent.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, offset: 10 })
    );
  });

  it('GET admin 400 se page inválido', async () => {
    const req = createMockRequest({ query: { page: '0' } });
    const res = createMockResponse();
    await MarketingCalendarService.listAdmin(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Parâmetro page inválido');
    expect(MarketingCalendarEvent.findAndCountAll).not.toHaveBeenCalled();
  });

  it('PUT admin 404 se não existe', async () => {
    MarketingCalendarEvent.findByPk.mockResolvedValue(null);
    const req = createMockRequest({ params: { id: '9' }, body: { title: 'X' } });
    const res = createMockResponse();
    await MarketingCalendarService.update(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body.success).toBe(false);
  });
});
