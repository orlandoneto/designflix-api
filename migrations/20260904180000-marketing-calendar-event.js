'use strict';

/** Calendário do Marketing — datas comerciais + slug de categoria para o Explorer. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const names = tables
      .map((t) => (typeof t === 'string' ? t : t.tableName || t.name || ''))
      .map((n) => String(n).toLowerCase());

    if (!names.includes('marketing_calendar_event')) {
      await queryInterface.createTable('marketing_calendar_event', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        title: {
          type: Sequelize.STRING(160),
          allowNull: false,
        },
        event_date: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        icon: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: '📅',
        },
        badge: {
          type: Sequelize.STRING(80),
          allowNull: true,
        },
        category_slug: {
          type: Sequelize.STRING(120),
          allowNull: false,
        },
        sort_order: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
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

      await queryInterface.addIndex('marketing_calendar_event', ['event_date'], {
        name: 'idx_mkt_cal_event_date',
      });
      await queryInterface.addIndex('marketing_calendar_event', ['category_slug'], {
        name: 'idx_mkt_cal_category_slug',
      });
      await queryInterface.addIndex('marketing_calendar_event', ['active', 'sort_order'], {
        name: 'idx_mkt_cal_active_sort',
      });
    }

    const [rows] = await queryInterface.sequelize.query(
      'SELECT COUNT(*) AS c FROM marketing_calendar_event'
    );
    const count = Number(rows?.[0]?.c ?? rows?.[0]?.C ?? 0);
    if (count > 0) return;

    const now = new Date();
    const seed = [
      {
        title: 'Dia do Artista',
        event_date: '2026-08-08',
        icon: '🎭',
        badge: null,
        category_slug: 'dia-do-artista',
        sort_order: 10,
      },
      {
        title: 'Dia dos Pais',
        event_date: '2026-08-09',
        icon: '👨‍👧‍👦',
        badge: 'Mais buscado',
        category_slug: 'dia-dos-pais',
        sort_order: 20,
      },
      {
        title: 'Dia Mundial da Fotografia',
        event_date: '2026-08-19',
        icon: '📷',
        badge: null,
        category_slug: 'dia-mundial-da-fotografia',
        sort_order: 30,
      },
      {
        title: 'Setembro Amarelo',
        event_date: '2026-09-01',
        icon: '🎗️',
        badge: 'Em alta',
        category_slug: 'setembro-amarelo',
        sort_order: 40,
      },
      {
        title: 'Independência do Brasil',
        event_date: '2026-09-07',
        icon: '🇧🇷',
        badge: null,
        category_slug: 'independencia-do-brasil',
        sort_order: 50,
      },
      {
        title: 'Dia do Cliente',
        event_date: '2026-09-15',
        icon: '🛒',
        badge: 'Vale conferir',
        category_slug: 'dia-do-cliente',
        sort_order: 60,
      },
      {
        title: 'Início da Primavera',
        event_date: '2026-09-22',
        icon: '🌸',
        badge: null,
        category_slug: 'inicio-da-primavera',
        sort_order: 70,
      },
      {
        title: 'Outubro Rosa',
        event_date: '2026-10-01',
        icon: '🎀',
        badge: null,
        category_slug: 'outubro-rosa',
        sort_order: 80,
      },
    ];

    await queryInterface.bulkInsert(
      'marketing_calendar_event',
      seed.map((row) => ({
        ...row,
        active: true,
        created_at: now,
        updated_at: now,
      }))
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('marketing_calendar_event');
  },
};
