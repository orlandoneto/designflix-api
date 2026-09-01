const express = require('express');
const request = require('supertest');
const { ok, badRequest, serverError } = require('../../src/utils/authHttpResponse');

function createApp() {
  const app = express();

  app.get('/ok', (req, res) => ok(res, { message: 'Sucesso', data: { id: 1 } }));
  app.get('/bad', (req, res) => badRequest(res, 'Dados inválidos'));
  app.get('/error', (req, res) => serverError(res, 'Falha interna'));

  return app;
}

describe('authHttpResponse', () => {
  const app = createApp();

  it('ok retorna 200 com envelope success true', async () => {
    const response = await request(app).get('/ok');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Sucesso',
      data: { id: 1 },
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

  it('serverError retorna 500 com envelope success false', async () => {
    const response = await request(app).get('/error');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: 'Falha interna',
    });
  });
});
