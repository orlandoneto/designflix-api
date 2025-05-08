const cron = require("node-cron");
const { UserPlans, Plans, Sequelize } = require("../models");
const stripe = require("../config/stripe");
const logger = require('../config/logger');

function upgradePlansJob() {
  // Executa todos os dias à meia-noite
  cron.schedule("0 0 * * *", async () => {
    try {
      const now = new Date();
      logger.info(`[Upgrade Plans Job] Iniciando verificação em ${now.toISOString()}`);

      // Buscar todos os planos agendados
      const scheduledUpgrades = await UserPlans.findAll({
        where: {
          scheduled_plan_start_at: {
            [Sequelize.Op.lte]: now,
          },
          scheduled_plan_id: {
            [Sequelize.Op.not]: null,
          },
        },
        include: [
          {
            model: Plans,
            as: "scheduled_plan",
            required: true,
            where: {
              stripe_plan_id: {
                [Sequelize.Op.not]: null,
              },
            },
          },
        ],
      });

      logger.info(`[Upgrade Plans Job] ${scheduledUpgrades.length} upgrades pendentes`);

      // Processar cada upgrade
      for (const userPlan of scheduledUpgrades) {
        const startTime = Date.now();
        try {
          logger.info(`[Upgrade Plans Job] Processando usuário ${userPlan.user_id}`);
          
          // Atualizar no Stripe se tiver subscription_id
          if (userPlan.stripe_subscription_id && userPlan.scheduled_plan.stripe_plan_id) {
            await stripe.subscriptions.update(userPlan.stripe_subscription_id, {
              items: [{
                price: userPlan.scheduled_plan.stripe_plan_id,
              }],
            });
            logger.info(`[Upgrade Plans Job] Stripe atualizado para usuário ${userPlan.user_id}`);
          }

          // Atualizar no banco de dados
          await userPlan.update({
            plan_id: userPlan.scheduled_plan_id,
            subscription_days_left: null,
            scheduled_plan_id: null,
            scheduled_plan_start_at: null,
          });

          const duration = Date.now() - startTime;
          logger.info(`[Upgrade Plans Job] Upgrade concluído para usuário ${userPlan.user_id} (${duration}ms)`);
          
        } catch (error) {
          logger.error(`[Upgrade Plans Job] Erro no upgrade do usuário ${userPlan.user_id}:`, {
            error: error.message,
            stack: error.stack,
          });
        }
      }
    } catch (error) {
      logger.error('[Upgrade Plans Job] Erro geral no cron job:', {
        error: error.message,
        stack: error.stack,
      });
    } finally {
      logger.info('[Upgrade Plans Job] Verificação concluída');
    }
  });

  logger.info('Cron job para upgrades de planos iniciado com sucesso');
}

module.exports = upgradePlansJob;