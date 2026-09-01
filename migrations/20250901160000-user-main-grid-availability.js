'use strict';

/** Separa disponibilidade (free/paid) do tipo de arquivo em `format`. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('user_main_grid', 'availability', {
      type: Sequelize.ENUM('free', 'paid'),
      allowNull: false,
      defaultValue: 'paid',
    });

    await queryInterface.sequelize.query(`
      UPDATE user_main_grid
      SET availability = 'free'
      WHERE UPPER(format) = 'GRATIS'
    `);

    await queryInterface.sequelize.query(`
      UPDATE user_main_grid
      SET format = CASE
        WHEN LOWER(COALESCE(url, url_cover, url_thumb, name)) LIKE '%.psd%' THEN 'PSD'
        WHEN LOWER(COALESCE(url, url_cover, url_thumb, name)) LIKE '%.png%' THEN 'PNG'
        WHEN LOWER(COALESCE(url, url_cover, url_thumb, name)) REGEXP '\\.(jpe?g)' THEN 'JPEG'
        WHEN LOWER(COALESCE(url, url_cover, url_thumb, name)) LIKE '%.fig%' THEN 'FIGMA'
        ELSE 'JPEG'
      END
      WHERE UPPER(format) = 'GRATIS'
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE user_main_grid
      SET format = 'GRATIS'
      WHERE availability = 'free'
    `);
    await queryInterface.removeColumn('user_main_grid', 'availability');
  },
};
