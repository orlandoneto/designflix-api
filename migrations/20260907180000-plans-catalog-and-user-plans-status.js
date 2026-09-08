'use strict';

/**
 * Base compartilhada entre gateways (não é específica do Asaas).
 *
 * 1. `plans` vira catálogo local de verdade (preço, ciclo, tier). Antes o preço
 *    morava no gateway e a tabela guardava só o ponteiro `stripe_price_id`.
 * 2. `user_plans` ganha `status` e `provider`. Sem `status` não existe estado
 *    "suspenso por inadimplência" — hoje o acesso é inferido de coluna não-nula.
 *
 * @see docs/contextos/plans.md
 */

const PLANS_TABLE = 'plans';
const USER_PLANS_TABLE = 'user_plans';

async function hasTable(queryInterface, table) {
  const tables = await queryInterface.showAllTables();
  return tables
    .map((t) => (typeof t === 'string' ? t : t.tableName || t.name || ''))
    .map((n) => String(n).toLowerCase())
    .includes(table);
}

async function addColumnIfMissing(queryInterface, table, column, spec) {
  const columns = await queryInterface.describeTable(table);
  if (!columns[column]) {
    await queryInterface.addColumn(table, column, spec);
  }
}

async function removeColumnIfPresent(queryInterface, table, column) {
  const columns = await queryInterface.describeTable(table);
  if (columns[column]) {
    await queryInterface.removeColumn(table, column);
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (await hasTable(queryInterface, PLANS_TABLE)) {
      await addColumnIfMissing(queryInterface, PLANS_TABLE, 'tier', {
        type: Sequelize.STRING(20),
        allowNull: true,
        after: 'plan_name',
      });
      await addColumnIfMissing(queryInterface, PLANS_TABLE, 'display_name', {
        type: Sequelize.STRING(120),
        allowNull: true,
        after: 'tier',
      });
      await addColumnIfMissing(queryInterface, PLANS_TABLE, 'price_cents', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        after: 'display_name',
      });
      await addColumnIfMissing(queryInterface, PLANS_TABLE, 'currency', {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'BRL',
        after: 'price_cents',
      });
      await addColumnIfMissing(queryInterface, PLANS_TABLE, 'billing_interval', {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'month',
        after: 'currency',
      });
      await addColumnIfMissing(queryInterface, PLANS_TABLE, 'features', {
        type: Sequelize.TEXT,
        allowNull: true,
        after: 'billing_interval',
      });
      await addColumnIfMissing(queryInterface, PLANS_TABLE, 'sort_order', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        after: 'features',
      });
      await addColumnIfMissing(queryInterface, PLANS_TABLE, 'active', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        after: 'sort_order',
      });
      // Qual gateway cobra esse plano. Nulo = plano gratuito (não cobra).
      await addColumnIfMissing(queryInterface, PLANS_TABLE, 'gateway', {
        type: Sequelize.STRING(20),
        allowNull: true,
        after: 'active',
      });

      // Plano free não tem price no gateway; a coluna vira legado do período Stripe.
      await queryInterface.changeColumn(PLANS_TABLE, 'stripe_price_id', {
        type: Sequelize.STRING,
        allowNull: true,
      });

      await queryInterface.sequelize.query(
        `UPDATE ${PLANS_TABLE}
            SET display_name = plan_name
          WHERE display_name IS NULL`
      );
      await queryInterface.sequelize.query(
        `UPDATE ${PLANS_TABLE}
            SET tier = CASE
                  WHEN LOWER(plan_name) LIKE '%free%' THEN 'free'
                  WHEN LOWER(plan_name) LIKE '%gratuito%' THEN 'free'
                  ELSE 'pro'
                END
          WHERE tier IS NULL`
      );
      // Planos pagos que já existem são da Stripe — o Asaas começa vazio.
      await queryInterface.sequelize.query(
        `UPDATE ${PLANS_TABLE}
            SET gateway = 'stripe'
          WHERE gateway IS NULL AND stripe_price_id IS NOT NULL`
      );
    }

    if (await hasTable(queryInterface, USER_PLANS_TABLE)) {
      await addColumnIfMissing(queryInterface, USER_PLANS_TABLE, 'status', {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'active',
        after: 'plan_id',
      });
      await addColumnIfMissing(queryInterface, USER_PLANS_TABLE, 'provider', {
        type: Sequelize.STRING(20),
        allowNull: true,
        after: 'status',
      });

      // Backfill: deduz o provider das colunas legadas antes de passarem a ser
      // preenchidas explicitamente.
      await queryInterface.sequelize.query(
        `UPDATE ${USER_PLANS_TABLE}
            SET provider = 'stripe'
          WHERE provider IS NULL AND stripe_customer_id IS NOT NULL`
      );
      await queryInterface.sequelize.query(
        `UPDATE ${USER_PLANS_TABLE}
            SET provider = 'mercadopago'
          WHERE provider IS NULL AND mercadopago_customer_id IS NOT NULL`
      );
      await queryInterface.sequelize.query(
        `UPDATE ${USER_PLANS_TABLE}
            SET status = 'canceled'
          WHERE plan_canceled = 1`
      );
    }
  },

  async down(queryInterface, Sequelize) {
    if (await hasTable(queryInterface, USER_PLANS_TABLE)) {
      await removeColumnIfPresent(queryInterface, USER_PLANS_TABLE, 'provider');
      await removeColumnIfPresent(queryInterface, USER_PLANS_TABLE, 'status');
    }

    if (await hasTable(queryInterface, PLANS_TABLE)) {
      for (const column of [
        'gateway',
        'active',
        'sort_order',
        'features',
        'billing_interval',
        'currency',
        'price_cents',
        'display_name',
        'tier',
      ]) {
        await removeColumnIfPresent(queryInterface, PLANS_TABLE, column);
      }

      await queryInterface.sequelize.query(
        `UPDATE ${PLANS_TABLE} SET stripe_price_id = '' WHERE stripe_price_id IS NULL`
      );
      await queryInterface.changeColumn(PLANS_TABLE, 'stripe_price_id', {
        type: Sequelize.STRING,
        allowNull: false,
      });
    }
  },
};
