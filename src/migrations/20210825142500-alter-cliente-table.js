'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.changeColumn('user', 'cpf', {
                type: Sequelize.STRING,
                allowNull: false
            })
        ])
    },

    down: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.changeColumn('user', 'cpf', {
                type: Sequelize.TEXT(11),
                allowNull: false
            })
        ])
    }
};