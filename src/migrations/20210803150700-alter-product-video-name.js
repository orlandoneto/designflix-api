'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.addColumn('product_video', 'name', {
                type: Sequelize.STRING,
                allowNull: false,
            })
        ])
    },

    down: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.removeColumn('product_video', 'name'),
        ])
    }
};