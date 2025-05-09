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

    // 3. Log dos IDs processados (opcional para auditoria)
    logger.debug(`[Upgrade Plans Job] IDs processados: ${upgradeIds.join(', ')}`);

  } catch (error) {
    logger.error('[Upgrade Plans Job] Erro no processamento:', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

function upgradePlansJob() {
  // Executa a cada 2 minutos '*/2 * * * *' para testes - alterar para '0 0 * * *' em produção
  cron.schedule('0 0 * * *', async () => {
    try {
      await processUpgrades();
    } catch (error) {
      logger.error('[Upgrade Plans Job] Erro no agendamento:', error);
    } finally {
      logger.info('[Upgrade Plans Job] Verificação concluída');
    }
  });

  // Executa imediatamente ao iniciar
  (async () => {
    try {
      logger.info('[Upgrade Plans Job] Verificando upgrades pendentes ao iniciar...');
      await processUpgrades();
    } catch (error) {
      logger.error('[Upgrade Plans Job] Erro na verificação inicial:', error);
    }
  })();

  logger.info('Cron job para upgrades de planos iniciado com sucesso');
}

module.exports = upgradePlansJob;