const express = require('express');
const request = require('supertest');

jest.mock('../../src/services/catalog/search-provider', () => ({
  createSearchProvider: jest.fn(),
}));

jest.mock('../../src/services/catalog/catalog-cache', () => ({
  buildCatalogCacheKey: jest.fn(() => 'cache-key'),
  getCached: jest.fn(async () => null),
  setCached: jest.fn(),
}));

const { createSearchProvider } = require('../../src/services/catalog/search-provider');
const CatalogService = require('../../src/services/catalog/catalog.service');

function createApp(service) {
  const app = express();
  app.get('/catalog/search', (req, res) => service.search(req, res));
  app.get('/catalog/facets', (req, res) => service.facets(req, res));
  app.get('/catalog/:id/similar', (req, res) => service.getSimilar(req, res));
  app.get('/catalog/:id', (req, res) => service.getById(req, res));
  return app;
}

describe('CatalogService HTTP envelope', () => {
  let provider;
  let service;
  let app;

  beforeEach(() => {
    provider = {
      search: jest.fn(),
      facets: jest.fn(),
      getById: jest.fn(),
      findSimilar: jest.fn(),
    };
    createSearchProvider.mockReturnValue(provider);
    service = new CatalogService();
    app = createApp(service);
  });

  it('search 200 com message + data + pagination + meta', async () => {
    provider.search.mockResolvedValue({
      data: [{ id: 1 }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      meta: { provider: 'mysql' },
    });

    const response = await request(app).get('/catalog/search?q=mockup');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Busca realizada com sucesso');
    expect(response.body.data).toEqual([{ id: 1, url: null }]);
    expect(response.body.pagination.total).toBe(1);
    expect(response.body.meta.provider).toBe('mysql');
  });

  it('search 400 quando page inválida', async () => {
    const response = await request(app).get('/catalog/search?page=0');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Parâmetro page inválido',
    });
    expect(provider.search).not.toHaveBeenCalled();
  });

  it('search 400 quando limit inválido', async () => {
    const response = await request(app).get('/catalog/search?limit=-2');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Parâmetro limit inválido',
    });
  });

  it('facets 200 com message', async () => {
    provider.facets.mockResolvedValue({
      formats: [{ value: 'PSD', count: 1 }],
      availability: [],
      categories: [],
    });

    const response = await request(app).get('/catalog/facets');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Facetas carregadas com sucesso');
    expect(response.body.data.formats[0].value).toBe('PSD');
  });

  it('getById 400 para id inválido', async () => {
    const response = await request(app).get('/catalog/abc');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'ID inválido',
    });
    expect(provider.getById).not.toHaveBeenCalled();
  });

  it('getById 404 quando não existe', async () => {
    provider.getById.mockResolvedValue(null);

    const response = await request(app).get('/catalog/999');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: 'Arquivo não encontrado',
    });
  });

  it('getById 200 com message + data', async () => {
    provider.getById.mockResolvedValue({ id: 7, name: 'Pack' });

    const response = await request(app).get('/catalog/7');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Arquivo encontrado',
      data: { id: 7, name: 'Pack' },
    });
  });

  it('search 500 com mensagem genérica', async () => {
    provider.search.mockRejectedValue(new Error('db down'));

    const response = await request(app).get('/catalog/search');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Erro ao buscar catálogo',
    });
  });

  it('getSimilar 200 com data + meta', async () => {
    provider.findSimilar.mockResolvedValue({
      data: [{ id: 2, name: 'Rel', url: 'https://cdn/clean.psd' }],
      meta: { provider: 'mysql', strategy: 'multi-signal', sourceId: 14 },
    });

    const response = await request(app).get('/catalog/14/similar?limit=8');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Recursos semelhantes encontrados');
    expect(response.body.data).toEqual([{ id: 2, name: 'Rel', url: null }]);
    expect(response.body.meta.strategy).toBe('multi-signal');
    expect(provider.findSimilar).toHaveBeenCalledWith(14, { limit: 8 });
  });

  it('getSimilar 404 quando origem não existe', async () => {
    provider.findSimilar.mockResolvedValue(null);

    const response = await request(app).get('/catalog/999/similar');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: 'Arquivo não encontrado',
    });
  });

  it('getSimilar 400 para limit inválido', async () => {
    const response = await request(app).get('/catalog/14/similar?limit=0');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Parâmetro limit inválido');
    expect(provider.findSimilar).not.toHaveBeenCalled();
  });
});
