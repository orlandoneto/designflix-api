'use strict';

/** Candidatura a colaborador + username e status no user (Figma). Pagamento não entra. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const userDesc = await queryInterface.describeTable('user');

    if (!userDesc.contributor_status) {
      await queryInterface.addColumn('user', 'contributor_status', {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'none',
      });
    }

    if (!userDesc.username) {
      await queryInterface.addColumn('user', 'username', {
        type: Sequelize.STRING(64),
        allowNull: true,
      });
    }

    await queryInterface.sequelize
      .query(`
        UPDATE user
        SET contributor_status = 'active'
        WHERE contributor = 1 AND (contributor_status IS NULL OR contributor_status = 'none')
      `)
      .catch(() => undefined);

    try {
      await queryInterface.addIndex('user', ['username'], {
        name: 'idx_user_username',
        unique: true,
      });
    } catch (_) {
      /* already exists */
    }

    const tables = await queryInterface.showAllTables();
    const names = tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.name || '')).map((n) => n.toLowerCase());
    if (!names.includes('contributor_application')) {
      await queryInterface.createTable('contributor_application', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        portfolio_url: {
          type: Sequelize.STRING(500),
          allowNull: false,
        },
        instagram: {
          type: Sequelize.STRING(120),
          allowNull: true,
        },
        behance: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        about: {
          type: Sequelize.STRING(500),
          allowNull: false,
        },
        status: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: 'pending',
        },
        terms_version: {
          type: Sequelize.STRING(64),
          allowNull: false,
        },
        terms_accepted_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        reviewed_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        reviewed_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        review_note: {
          type: Sequelize.STRING(500),
          allowNull: true,
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

      await queryInterface.addIndex('contributor_application', ['user_id'], {
        name: 'idx_contributor_application_user',
      });
      await queryInterface.addIndex('contributor_application', ['status'], {
        name: 'idx_contributor_application_status',
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('contributor_application').catch(() => undefined);
    const userDesc = await queryInterface.describeTable('user');
    if (userDesc.contributor_status) {
      await queryInterface.removeColumn('user', 'contributor_status');
    }
    if (userDesc.username) {
      await queryInterface.removeColumn('user', 'username');
    }
  },
};
