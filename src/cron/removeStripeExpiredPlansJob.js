const cron = require('node-cron');
const { UserPlans, Plans, User, Sequelize } = require('../models');
const logger = require('../config/logger');
const { sendEmail } = require('../utils/emailService');
const { PLAN_NAMES } = require("../utils/constants/constants");

const SHOW_LOGS = false;
const IS_TESTING = true; // Controla o schedule do cron job

// Schedule baseado no ambiente
const CRON_SCHEDULE = IS_TESTING ? '*/2 * * * *' : '0 0 * * *';

async function processExpiredPlans() {
  const now = new Date();
  logger.info(`[Remove Stripe Expired Plans Job] Iniciando verificação em ${now.toISOString()}`);
  if (SHOW_LOGS) console.log(`[Remove Stripe Expired Plans Job] Iniciando verificação em ${now.toISOString()}`);

  try {
    // Buscar planos cancelados que já expiraram
    const expiredPlans = await UserPlans.findAll({
      where: {
        plan_canceled: true,
        [Sequelize.Op.or]: [
          { subscription_days_left: { [Sequelize.Op.lte]: 0 } },
          { plan_finish_at: { [Sequelize.Op.lte]: now } }
        ]
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Plans,
          as: 'plans',
          attributes: ['id', 'plan_name']
        }
      ]
    });

    if (SHOW_LOGS) console.log(`[Remove Stripe Expired Plans Job] ${expiredPlans.length} planos expirados encontrados`);

    for (const plan of expiredPlans) {
      try {
        // Enviar email de notificação antes de remover
        const emailParams = {
          email: plan.user.email,
          name: plan.user.name,
          title: 'Plano Removido',
          description: 'Seu plano foi removido por ter expirado após o cancelamento.'
        };

        const contextParams = {
          name: plan.user.name,
          planName: PLAN_NAMES?.[plan.plans.plan_name] || plan.plans.plan_name,
          expirationDate: new Date(plan.plan_finish_at).toLocaleDateString('pt-BR'),
          cancellationDate: new Date().toLocaleDateString('pt-BR'),
          baseUrl: process.env.API_URL
        };

        // Enviar email
        await sendEmail(emailParams, 'customerSubscriptionDeleted', contextParams);

        // Remover o plano
        await plan.destroy();

        logger.info(`[Remove Stripe Expired Plans Job] Plano removido para usuário ${plan.user_id} (${plan.user.email})`);
        if (SHOW_LOGS) console.log(`[Remove Stripe Expired Plans Job] Plano removido para usuário ${plan.user_id} (${plan.user.email})`);

      } catch (error) {
        logger.error(`[Remove Stripe Expired Plans Job] Erro ao processar plano ${plan.id}:`, error);
        if (SHOW_LOGS) console.error(`[Remove Stripe Expired Plans Job] Erro ao processar plano ${plan.id}:`, error);
      }
    }

  } catch (error) {
    logger.error('[Remove Stripe Expired Plans Job] Erro no processamento:', error);
    if (SHOW_LOGS) console.error('[Remove Stripe Expired Plans Job] Erro no processamento:', error);
    throw error;
  }
}

function removeStripeExpiredPlansJob() {
  // Em produção: '0 0 * * *' (todos os dias à meia-noite)
  // Em teste: '*/2 * * * *' (a cada 2 minutos)
  cron.schedule(CRON_SCHEDULE, async () => {
    try {
      logger.info('[Cron] Executando verificação de planos Stripe expirados...');
      if (SHOW_LOGS) console.log('[Cron] Executando verificação de planos Stripe expirados...');
      await processExpiredPlans();
    } catch (error) {
      logger.error('[Cron] Erro na verificação de planos Stripe expirados:', error);
      if (SHOW_LOGS) console.error('[Cron] Erro na verificação de planos Stripe expirados:', error);
    }
  }, {
    scheduled: true,
    timezone: "America/Sao_Paulo"
  });

  // Execução imediata ao iniciar
  (async () => {
    try {
      logger.info('[Cron] Executando verificação inicial de planos Stripe expirados...');
      if (SHOW_LOGS) console.log('[Cron] Executando verificação inicial de planos Stripe expirados...');
      await processExpiredPlans();
    } catch (error) {
      logger.error('[Cron] Erro na execução inicial:', error);
      if (SHOW_LOGS) console.error('[Cron] Erro na execução inicial:', error);
    }
  })();
}

module.exports = removeStripeExpiredPlansJob; 