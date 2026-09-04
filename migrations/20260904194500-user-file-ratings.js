'use strict';

/** Avaliações (1–5 estrelas) por usuário × arquivo do catálogo. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const names = tables
      .map((t) => (typeof t === 'string' ? t : t.tableName || t.name || ''))
      .map((n) => String(n).toLowerCase());

    if (names.includes('user_file_ratings')) return;

    await queryInterface.createTable('user_file_ratings', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      user_main_grid_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      score: {
        type: Sequelize.TINYINT,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('user_file_ratings', ['user_id', 'user_main_grid_id'], {
      unique: true,
      name: 'uq_user_file_ratings_user_grid',
    });
    await queryInterface.addIndex('user_file_ratings', ['user_main_grid_id'], {
      name: 'idx_user_file_ratings_grid',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_file_ratings');
  },
};
