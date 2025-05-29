"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("user_plans", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.INTEGER,
      },
      plan_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "plans",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      stripe_customer_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      mercadopago_customer_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      subscription_days_left: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      plan_finish_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      cron_executed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      plan_canceled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("user_plans");
  },
};
