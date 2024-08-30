'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('treinamentos', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING
      },
      instrutor: {
        type: Sequelize.STRING
      },
      local: {
        type: Sequelize.STRING
      },
      url_treinamento: {
        type: Sequelize.STRING
      },
      pre_requisito_obrigatorio: {
        type: Sequelize.TEXT
      },
      pre_requisito_opcional: {
        type: Sequelize.TEXT
      },
      n_vagas: {
        type: Sequelize.INTEGER
      },
      inicio: {
        allowNull: false,
        type: Sequelize.DATE
      },
      fim: {
        allowNull: false,
        type: Sequelize.DATE
      }, 
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('treinamentos');
  }
};