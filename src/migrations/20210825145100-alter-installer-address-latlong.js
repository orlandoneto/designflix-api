'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.addColumn('installer', 'lat', {
                type: Sequelize.STRING
            }),
            queryInterface.addColumn('installer', 'long', {
                type: Sequelize.STRING
            })
        ])
    },

    down: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.removeColumn('installer', 'lat'),
            queryInterface.removeColumn('installer', 'long')
        ])
    }
};