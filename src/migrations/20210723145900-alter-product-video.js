'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.removeColumn('product_video', 'product_manual_id'),
            queryInterface.addColumn('product_video', 'product_id', {
                type: Sequelize.INTEGER,
                allowNull: false,
            })
        ])
    },

    down: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.removeColumn('product_video', 'product_id'),
            queryInterface.addColumn('product_video', 'product_manual_id', {
                type: Sequelize.INTEGER,
                allowNull: false,
            })
        ])
    }
};