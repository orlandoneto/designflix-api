'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.addColumn('treinamentos', 'id_tema', {
                type: Sequelize.INTEGER
            }),
            queryInterface.addColumn('treinamentos', 'hora_inicio', {
                type: Sequelize.STRING,
                allowNull: false,
            }),
            queryInterface.addColumn('treinamentos', 'fim_treinamento', {
                type: Sequelize.DATE,
                allowNull: false,
            }),
            queryInterface.addColumn('treinamentos', 'hora_fim_treinamento', {
                type: Sequelize.STRING,
                allowNull: false,
            }),
            queryInterface.removeColumn('treinamentos', 'pre_requisito_obrigatorio')
        ])
    },

    down: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.addColumn('treinamentos', 'pre_requisito_obrigatorio', {
                type: Sequelize.TEXT
            }),
            queryInterface.removeColumn('treinamentos', 'id_tema'),
            queryInterface.removeColumn('treinamentos', 'hora_inicio'),
            queryInterface.removeColumn('treinamentos', 'fim_treinamento'),
            queryInterface.removeColumn('treinamentos', 'hora_fim_treinamento')
        ])
    }
};