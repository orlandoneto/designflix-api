'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.addColumn('treinamentos', 'descricao', {
                type: Sequelize.TEXT,
                allowNull: true,
            }),
        ])
    },

    down: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.dropColumn('treinamentos', 'descricao')
        ])
    }
};