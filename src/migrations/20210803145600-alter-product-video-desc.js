'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.addColumn('product_video', 'description', {
                type: Sequelize.TEXT,
                allowNull: false,
            })
        ])
    },

    down: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.removeColumn('product_video', 'description'),
        ])
    }
};