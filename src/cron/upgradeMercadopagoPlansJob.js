const cron = require("node-cron");
const { UserPlans, User, Plans, Sequelize } = require("../models");
const { sendEmail } = require("../utils/emailService");
const logger = require("../config/logger");

class PlanNotificationJob {
  constructor() {
    this.job = null;
  }

  async checkPlanExpirations() {
    const now = new Date();
    logger.info(
      `[PlanNotificationJob] Verificação iniciada em ${now.toISOString()}`
    );

    try {
      const activePlans = await UserPlans.findAll({
        where: {
          created_at: { [Sequelize.Op.not]: null },
          plan_finish_at: { [Sequelize.Op.not]: null },
        },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email"],
          },
          {
            model: Plans,
            as: "plans",
            attributes: ["id", "plan_name", "price"],
          },
        ],
      });

      for (const plan of activePlans) {
        const createdAt = new Date(plan.created_at);
        const finishDate = new Date(plan.plan_finish_at);
        const now = new Date();

        const totalMs = finishDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(totalMs / (1000 * 60 * 60 * 24));
        const totalDaysFromCreation = Math.ceil(
          (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        const isExpired = totalDaysFromCreation > 30 || daysRemaining <= 0;

        if (isExpired) {
          await this.handleExpiredPlan(plan);
          continue;
        }

        if ([5, 2, 1].includes(daysRemaining)) {
          await this.sendPlanNotification(plan, daysRemaining);
        }
      }
    } catch (error) {
      logger.error("[PlanNotificationJob] Erro no processamento:", error);
    }
  }

  async handleExpiredPlan(plan) {
    try {
      logger.info(`🗑️ Removendo plano expirado do usuário ${plan.user_id}`);
      await plan.destroy();

      const emailTemplate = {
        name: plan.user.name,
        planName: plan.plans.plan_name,
        expirationDate: new Date(plan.plan_finish_at).toLocaleDateString(
          "pt-BR"
        ),
        daysRemaining: 0,
        isExpired: true,
        isLastDay: false,
        baseUrl: process.env.APP_URL,
        renewalLink: `${process.env.APP_URL}/renew-plan`,
        buttonColor: "#e63946",
        highlightColor: "#e63946",
        daysText: "hoje",
        expirationMessage: "expirou em",
        urgencyMessage: "⚠️ Seu plano expirou",
      };

      await sendEmail({
        email: plan.user.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      });
    } catch (error) {
      logger.error(
        `[PlanNotificationJob] Erro ao remover plano expirado:`,
        error
      );
    }
  }

  async sendPlanNotification(plan, daysRemaining) {
    try {
      logger.info(
        `📧 Enviando notificação para ${plan.user.email} - Faltam ${daysRemaining} dias`
      );

      const urgencyMap = {
        5: {
          urgencyMessage: "📆 Seu plano expira em breve!",
          color: "#007bff",
        },
        2: { urgencyMessage: "⏳ Restam apenas 2 dias!", color: "#ff9800" },
        1: { urgencyMessage: "⚠️ Último dia para renovar!", color: "#e63946" },
      };

      const { urgencyMessage, color } = urgencyMap[daysRemaining] || {};

      const emailTemplate = {
        name: plan.user.name,
        planName: plan.plans.plan_name,
        expirationDate: new Date(plan.plan_finish_at).toLocaleDateString(
          "pt-BR"
        ),
        daysRemaining,
        isExpired: false,
        isLastDay: daysRemaining === 1,
        baseUrl: process.env.APP_URL,
        renewalLink: `${process.env.APP_URL}/renew-plan`,
        buttonColor: color,
        highlightColor: color,
        daysText: `${daysRemaining} dia${daysRemaining > 1 ? "s" : ""}`,
        expirationMessage: "vai expirar em",
        urgencyMessage,
      };

      await sendEmail({
        email: plan.user.email,
        subject: `Seu plano expira em ${daysRemaining} dia${
          daysRemaining > 1 ? "s" : ""
        }`,
        html: emailTemplate.html,
      });
    } catch (error) {
      logger.error(`[PlanNotificationJob] Erro ao enviar notificação:`, error);
    }
  }

  start() {
    this.job = cron.schedule(
      "0 9 * * *", // diariamente às 9h
      () => this.checkPlanExpirations(),
      { scheduled: true, timezone: "America/Sao_Paulo" }
    );
    logger.info("✅ PlanNotificationJob agendado para rodar diariamente às 9h");
  }

  stop() {
    if (this.job) this.job.stop();
  }
}

const planNotificationJob = new PlanNotificationJob();
planNotificationJob.start();

module.exports = planNotificationJob;
