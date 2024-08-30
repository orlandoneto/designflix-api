'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.addColumn('inscricao_treinamento', 'status', {
                type: Sequelize.STRING,
                allowNull: true,
            }),
        ])
    },

    down: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.dropColumn('inscricao_treinamento', 'status')
        ])
    }
};