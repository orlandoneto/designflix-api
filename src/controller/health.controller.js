/**
 * GET /health — a instância está servindo?
 *
 * Existe porque "o processo subiu" não é a mesma coisa que "a API responde":
 * o PM2 considera saudável qualquer worker que não morreu, mesmo com o MySQL
 * fora. Quem decide gravidade é `src/utils/healthCheck.js`.
 */

const { sequelize } = require('../models');
const { redis } = require('../config/redis');
const { ok, serverError } = require('../utils/httpResponse');
const { inspectHealth } = require('../utils/healthCheck');

module.exports = (app) => {
  app.get('/health', async (req, res) => {
    const report = await inspectHealth({ sequelize, redis });

    if (!report.healthy) {
      return serverError(res, 'Banco de dados indisponível');
    }

    return ok(res, {
      message: report.degraded ? 'API operando sem cache' : 'API saudável',
      meta: report.checks,
    });
  });
};
