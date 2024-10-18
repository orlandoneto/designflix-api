'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.addColumn('user_address', 'lat', {
                type: Sequelize.STRING
            }),
            queryInterface.addColumn('user_address', 'long', {
                type: Sequelize.STRING
            })
        ])
    },

    down: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.removeColumn('user_address', 'lat'),
            queryInterface.removeColumn('user_address', 'long')
        ])
    }
};