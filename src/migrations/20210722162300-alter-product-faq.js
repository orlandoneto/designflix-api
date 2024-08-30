'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.removeColumn('product_faq', 'product_id'),
        ])
    },

    down: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.addColumn('product_faq', 'product_id', {
                type: Sequelize.INTEGER,
                allowNull: false,
            })
        ])
    }
};