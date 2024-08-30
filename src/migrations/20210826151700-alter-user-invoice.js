'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.addColumn('user_invoice', 'tipo_nota', {
                type: Sequelize.ENUM(),
                values: ['revenda', 'imovel', 'sem_nota'],
                allowNull: false,
            }),
            queryInterface.addColumn('user_invoice', 'descricao', {
                type: Sequelize.TEXT,
                defaultValue: '',
                allowNull: false,
            }),
            queryInterface.addColumn('user_invoice', 'termino_garantia', {
                type: Sequelize.DATE,
            }),
        ])
    },

    down: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.removeColumn('user_invoice', 'tipo_nota'),
            queryInterface.removeColumn('user_invoice', 'descricao'),
            queryInterface.removeColumn('user_invoice', 'termino_garantia')
        ])
    }
};