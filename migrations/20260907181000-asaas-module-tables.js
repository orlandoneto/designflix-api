'use strict';

/**
 * Tabelas exclusivas do módulo Asaas.
 *
 * O Asaas não divide espaço com o legado: em vez de empilhar colunas em
 * `user_plans` (como `stripe_customer_id` / `mercadopago_customer_id` fizeram),
 * o módulo tem tabelas próprias. `user_plans` continua sendo o registro de
 * direito de acesso, agnóstico de gateway.
 *
 * @see docs/contextos/plans.md
 */

const ASAAS_SUBSCRIPTIONS_TABLE = 'asaas_subscriptions';
const ASAAS_WEBHOOK_EVENTS_TABLE = 'asaas_webhook_events';

async function hasTable(queryInterface, table) {
  const tables = await queryInterface.showAllTables();
  return tables
    .map((t) => (typeof t === 'string' ? t : t.tableName || t.name || ''))
    .map((n) => String(n).toLowerCase())
    .includes(table);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await hasTable(queryInterface, ASAAS_SUBSCRIPTIONS_TABLE))) {
      await queryInterface.createTable(ASAAS_SUBSCRIPTIONS_TABLE, {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        plan_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        asaas_customer_id: {
          type: Sequelize.STRING(60),
          allowNull: false,
        },
        asaas_subscription_id: {
          type: Sequelize.STRING(60),
          allowNull: false,
        },
        asaas_billing_type: {
          type: Sequelize.STRING(20),
          allowNull: false,
        },
        asaas_cycle: {
          type: Sequelize.STRING(20),
          allowNull: false,
        },
        asaas_status: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: 'ACTIVE',
        },
        asaas_value_cents: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        asaas_next_due_date: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      });

      await queryInterface.addIndex(ASAAS_SUBSCRIPTIONS_TABLE, ['user_id'], {
        name: 'idx_asaas_subscriptions_user_id',
      });
      await queryInterface.addIndex(
        ASAAS_SUBSCRIPTIONS_TABLE,
        ['asaas_subscription_id'],
        { name: 'uq_asaas_subscriptions_subscription_id', unique: true }
      );
      await queryInterface.addIndex(
        ASAAS_SUBSCRIPTIONS_TABLE,
        ['asaas_customer_id'],
        { name: 'idx_asaas_subscriptions_customer_id' }
      );
    }

    // Idempotência de webhook: o Asaas reentrega evento até receber 200.
    // Sem essa tabela, reentrega = e-mail duplicado e acesso concedido duas vezes.
    if (!(await hasTable(queryInterface, ASAAS_WEBHOOK_EVENTS_TABLE))) {
      await queryInterface.createTable(ASAAS_WEBHOOK_EVENTS_TABLE, {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        asaas_event_id: {
          type: Sequelize.STRING(120),
          allowNull: false,
        },
        asaas_event_name: {
          type: Sequelize.STRING(60),
          allowNull: false,
        },
        asaas_payment_id: {
          type: Sequelize.STRING(60),
          allowNull: true,
        },
        asaas_subscription_id: {
          type: Sequelize.STRING(60),
          allowNull: true,
        },
        asaas_processed_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      });

      await queryInterface.addIndex(
        ASAAS_WEBHOOK_EVENTS_TABLE,
        ['asaas_event_id'],
        { name: 'uq_asaas_webhook_events_event_id', unique: true }
      );
    }
  },

  async down(queryInterface) {
    if (await hasTable(queryInterface, ASAAS_WEBHOOK_EVENTS_TABLE)) {
      await queryInterface.dropTable(ASAAS_WEBHOOK_EVENTS_TABLE);
    }
    if (await hasTable(queryInterface, ASAAS_SUBSCRIPTIONS_TABLE)) {
      await queryInterface.dropTable(ASAAS_SUBSCRIPTIONS_TABLE);
    }
  },
};
