const express = require('express');
const request = require('supertest');
const { gone } = require('../../src/utils/httpResponse');

describe('catalog legacy routes removed', () => {
  const app = express();
  app.get('/user-main-grid/flter', (req, res) =>
    gone(
      res,
      'Endpoint removido. Use GET /catalog/search, /catalog/facets ou /catalog/:id'
    )
  );

  it('responde 410 com mensagem apontando /catalog', async () => {
    const response = await request(app).get('/user-main-grid/flter');

    expect(response.status).toBe(410);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('/catalog/search');
  });
});
