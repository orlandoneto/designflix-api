const cron = require('node-cron');
const { UserPlans, Sequelize } = require('../models');
const logger = require('../config/logger');

async function processUpgrades() {
  const now = new Date();
  logger.info(`[Upgrade Plans Job] Iniciando verificação em ${now.toISOString()}`);
  console.log(`[Upgrade Plans Job] Iniciando verificação em ${now.toISOString()}`);

  try {
    // 1. Buscar os upgrades pendentes que ainda não foram processados
    const pendingUpgrades = await UserPlans.findAll({
      attributes: ['id', 'scheduled_plan_id'], // Apenas os campos necessários
      where: {
        scheduled_plan_id: { [Sequelize.Op.not]: null },
        scheduled_plan_start_at: { [Sequelize.Op.lte]: now },
        cron_executed: false // Só processa os que não foram executados ainda
      },
      order: [['scheduled_plan_start_at', 'ASC']],
      raw: true
    });

    const upgradeIds = pendingUpgrades.map(up => up.id);
    logger.info(`[Upgrade Plans Job] ${upgradeIds.length} upgrades pendentes encontrados`);
    console.log(`[Upgrade Plans Job] ${upgradeIds.length} upgrades pendentes encontrados`);

    if (upgradeIds.length === 0) {
      return;
    }

    // 2. Atualização em massa direta
    const [affectedRows] = await UserPlans.update({
      plan_id: Sequelize.col('scheduled_plan_id'), // Pega o valor do scheduled_plan_id
      scheduled_plan_id: null,
      scheduled_plan_start_at: null,
      subscription_days_left: null,
      cron_executed: true // Marca como executado
    }, {
      where: {
        id: { [Sequelize.Op.in]: upgradeIds }
      }
    });

    logger.info(`[Upgrade Plans Job] ${affectedRows} registros atualizados com sucesso`);
    console.log(`[Upgrade Plans Job] ${affectedRows} registros atualizados com sucesso`);

    // 3. Log dos IDs processados (opcional para auditoria)
    logger.debug(`[Upgrade Plans Job] IDs processados: ${upgradeIds.join(', ')}`);
    console.log(`[Upgrade Plans Job] IDs processados: ${upgradeIds.join(', ')}`);

  } catch (error) {
    logger.error('[Upgrade Plans Job] Erro no processamento:', {
      error: error.message,
      stack: error.stack
    });
    console.error('[Upgrade Plans Job] Erro no processamento:', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

function upgradePlansJob() {
  // Agendamento para rodar a cada 2 minutos
  cron.schedule('*/2 * * * *', async () => {  // <- Alteração principal aqui
    try {
      logger.info('[Cron] Executando verificação agendada (a cada 2 minutos)...');
      console.log('[Cron] Executando verificação agendada (a cada 2 minutos)...');
      await processUpgrades();
    } catch (error) {
      logger.error('[Cron] Erro no agendamento:', error);
      console.error('[Cron] Erro no agendamento:', error);
    }
  }, {
    scheduled: true,
    timezone: "America/Sao_Paulo" // Ajuste para seu fuso horário
  });

  // Execução imediata ao iniciar (opcional)
  (async () => {
    try {
      logger.info('[Cron] Executando verificação inicial...');
      console.log('[Cron] Executando verificação inicial...');
      await processUpgrades();
    } catch (error) {
      logger.error('[Cron] Erro na execução inicial:', error);
      console.error('[Cron] Erro na execução inicial:', error);
    }
  })();
}

module.exports = upgradePlansJob;