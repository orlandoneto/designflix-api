"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("plans", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      stripe_price_id: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      plan_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      count_downloads: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      current_count_downloads: {
        type: Sequelize.INTEGER,
        allowNull: false,
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
    await queryInterface.dropTable("plans");
  },
};
