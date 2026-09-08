/**
 * Cron da tolerância de inadimplência.
 *
 * Diário à 01h (America/Sao_Paulo). A regra em si está em
 * `src/services/plans/plan-suspension.js` — aqui só o agendamento.
 */

const cron = require('node-cron');
const logger = require('../config/logger');
const { processPlanSuspensions } = require('../services/plans/plan-suspension');

const SHOW_LOGS = process.env.LOG_LEVEL === 'debug';

async function runPlanSuspensions(label) {
  try {
    const result = await processPlanSuspensions();
    const message = `[Cron] ${label}: ${result.suspended} suspensos, ${result.expired} expirados`;
    logger.info(message);
    if (SHOW_LOGS) console.log(message);
  } catch (error) {
    logger.error(`[Cron] Erro em ${label}:`, error);
    if (SHOW_LOGS) console.error(`[Cron] Erro em ${label}:`, error);
  }
}

function planSuspensionJob() {
  cron.schedule(
    '0 1 * * *',
    () => runPlanSuspensions('suspensão de planos'),
    { scheduled: true, timezone: 'America/Sao_Paulo' }
  );
}

module.exports = planSuspensionJob;
module.exports.runPlanSuspensions = runPlanSuspensions;
