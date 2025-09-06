'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('landing_pages', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      username: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      video_url: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      image_url: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      cta_text: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      cta_link: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      tracking_code: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'user',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: {
        type: Sequelize.DATE,
        field: "created_at",
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        field: "updated_at",
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Índices
    await queryInterface.addIndex('landing_pages', ['username'], { name: 'idx_landing_pages_username' });
    await queryInterface.addIndex('landing_pages', ['user_id'], { name: 'idx_landing_pages_user_id' });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('landing_pages', 'idx_landing_pages_user_id');
    await queryInterface.removeIndex('landing_pages', 'idx_landing_pages_username');
    await queryInterface.dropTable('landing_pages');
  },
};


