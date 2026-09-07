'use strict';

/** Dimensões do preview + tamanho do arquivo (upload). Nullable — não bloqueia upload legado. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('user_main_grid', 'width', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
    });
    await queryInterface.addColumn('user_main_grid', 'height', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
    });
    await queryInterface.addColumn('user_main_grid', 'file_size', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: null,
      comment: 'Bytes do arquivo de conteúdo (ou preview se não houver conteúdo)',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('user_main_grid', 'file_size');
    await queryInterface.removeColumn('user_main_grid', 'height');
    await queryInterface.removeColumn('user_main_grid', 'width');
  },
};
