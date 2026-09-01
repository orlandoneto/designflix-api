'use strict';

/** Cadastro simplificado: telefone e country_code deixam de ser obrigatórios. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('user', 'phone', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.changeColumn('user', 'country_code', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('user', 'phone', {
      type: Sequelize.STRING,
      allowNull: false,
    });

    await queryInterface.changeColumn('user', 'country_code', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },
};
