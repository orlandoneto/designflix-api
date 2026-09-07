'use strict';

/** Curtidas (like) distintas de favoritos/salvar — Figma detalhe. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const names = tables
      .map((t) => (typeof t === 'string' ? t : t.tableName || t.name || ''))
      .map((n) => String(n).toLowerCase());

    if (!names.includes('user_likes')) {
      await queryInterface.createTable('user_likes', {
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

      await queryInterface.addIndex('user_likes', ['user_id', 'user_main_grid_id'], {
        name: 'idx_user_likes_user_grid',
        unique: true,
      });
      await queryInterface.addIndex('user_likes', ['user_main_grid_id'], {
        name: 'idx_user_likes_grid',
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_likes').catch(() => undefined);
  },
};
