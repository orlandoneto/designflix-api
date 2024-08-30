'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.removeColumn('temas', 'pre_requisito_obrigatorio')
        ])
    },

    down: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.addColumn('temas', 'pre_requisito_obrigatorio', {
                type: Sequelize.TEXT,
            })
        ])
    }
};