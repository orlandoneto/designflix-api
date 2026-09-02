'use strict';

/** Índices de catálogo + slug em categories (Explorer / Meilisearch prep). */
module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const sequelize = qi.sequelize;

    // categories.slug
    const catDesc = await qi.describeTable('categories');
    if (!catDesc.slug) {
      await qi.addColumn('categories', 'slug', {
        type: Sequelize.STRING(120),
        allowNull: true,
      });
    }

    await sequelize.query(`
      UPDATE categories
      SET slug = LOWER(
        TRIM(
          BOTH '-' FROM
          REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
            LOWER(name),
            'á','a'),'ã','a'),'é','e'),'í','i'),'ó','o')
        )
      )
      WHERE slug IS NULL OR slug = ''
    `).catch(() =>
      sequelize.query(`
        UPDATE categories
        SET slug = LOWER(REPLACE(REPLACE(name, ' ', '-'), '--', '-'))
        WHERE slug IS NULL OR slug = ''
      `)
    );

    // FULLTEXT(terms) — ignore se já existir
    await sequelize
      .query('ALTER TABLE user_main_grid ADD FULLTEXT INDEX ft_user_main_grid_terms (terms)')
      .catch(() => undefined);

    const addIndexSafe = async (table, fields, name) => {
      try {
        await qi.addIndex(table, fields, { name });
      } catch (_) {
        /* already exists */
      }
    };

    await addIndexSafe('user_main_grid', ['activite', 'created_at'], 'idx_umg_activite_created');
    await addIndexSafe('user_main_grid', ['activite', 'format'], 'idx_umg_activite_format');
    await addIndexSafe('user_main_grid', ['activite', 'availability'], 'idx_umg_activite_availability');
    await addIndexSafe(
      'user_main_grid_categories',
      ['category_id', 'user_main_grid_id'],
      'idx_umgc_category_grid'
    );
    await addIndexSafe('categories', ['slug'], 'idx_categories_slug');
  },

  async down(queryInterface) {
    const qi = queryInterface;
    const dropIndexSafe = async (table, name) => {
      try {
        await qi.removeIndex(table, name);
      } catch (_) {
        /* ignore */
      }
    };

    await dropIndexSafe('user_main_grid', 'ft_user_main_grid_terms');
    await dropIndexSafe('user_main_grid', 'idx_umg_activite_created');
    await dropIndexSafe('user_main_grid', 'idx_umg_activite_format');
    await dropIndexSafe('user_main_grid', 'idx_umg_activite_availability');
    await dropIndexSafe('user_main_grid_categories', 'idx_umgc_category_grid');
    await dropIndexSafe('categories', 'idx_categories_slug');

    const catDesc = await qi.describeTable('categories');
    if (catDesc.slug) {
      await qi.removeColumn('categories', 'slug');
    }
  },
};
