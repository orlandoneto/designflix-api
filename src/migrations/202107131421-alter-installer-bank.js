'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.changeColumn('installer', 'bank_bank', {
                type: Sequelize.STRING,
                allowNull: true,
            }),
            queryInterface.changeColumn('installer', 'bank_agency', {
                type: Sequelize.STRING,
                allowNull: true,
            }),
            queryInterface.changeColumn('installer', 'bank_number', {
                type: Sequelize.STRING,
                allowNull: true,
            }),
            queryInterface.changeColumn('installer', 'bank_name', {
                type: Sequelize.STRING,
                allowNull: true,
            })
        ])
    },

    down: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.changeColumn('installer', 'bank_bank', {
                type: Sequelize.STRING,
                allowNull: false,
            }),
            queryInterface.changeColumn('installer', 'bank_agency', {
                type: Sequelize.STRING,
                allowNull: false,
            }),
            queryInterface.changeColumn('installer', 'bank_number', {
                type: Sequelize.STRING,
                allowNull: false,
            }),
            queryInterface.changeColumn('installer', 'bank_name', {
                type: Sequelize.STRING,
                allowNull: false,
            })
        ])
    }
};