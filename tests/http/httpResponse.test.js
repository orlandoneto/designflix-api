const express = require('express');
const request = require('supertest');
const {
  ok,
  badRequest,
  notFound,
  gone,
  serverError,
} = require('../../src/utils/httpResponse');

function createApp() {
  const app = express();

  app.get('/ok', (req, res) =>
    ok(res, {
      message: 'Sucesso',
      data: { id: 1 },
      pagination: { page: 1 },
      meta: { provider: 'mysql' },
    })
  );
  app.get('/bad', (req, res) => badRequest(res, 'Dados inválidos'));
  app.get('/missing', (req, res) => notFound(res, 'Não encontrado'));
  app.get('/legacy', (req, res) => gone(res, 'Endpoint removido'));
  app.get('/error', (req, res) => serverError(res, 'Falha interna'));

  return app;
}

describe('httpResponse', () => {
  const app = createApp();

  it('ok retorna 200 com envelope success true', async () => {
    const response = await request(app).get('/ok');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Sucesso',
      data: { id: 1 },
      pagination: { page: 1 },
      meta: { provider: 'mysql' },
    });
  });

  it('badRequest retorna 400 com envelope success false', async () => {
    const response = await request(app).get('/bad');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Dados inválidos',
    });
  });

  it('notFound retorna 404', async () => {
    const response = await request(app).get('/missing');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: 'Não encontrado',
    });
  });

  it('gone retorna 410', async () => {
    const response = await request(app).get('/legacy');

    expect(response.status).toBe(410);
    expect(response.body).toEqual({
      success: false,
      message: 'Endpoint removido',
    });
  });

  it('serverError retorna 500 com envelope success false', async () => {
    const response = await request(app).get('/error');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Falha interna',
    });
  });
});
