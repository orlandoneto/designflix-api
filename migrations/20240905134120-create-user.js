"use strict";

/**
 * Conta pública (`user`). Também era criada só via sync.
 * Precisa existir antes de `user_main_grid` e landing_pages (FK).
 * Colunas `username` / `contributor_status` entram em migration posterior.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const names = tables
      .map((t) => (typeof t === "string" ? t : t.tableName || t.name || ""))
      .map((n) => String(n).toLowerCase());

    if (names.includes("user")) {
      return;
    }

    await queryInterface.createTable("user", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      contributor: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      photo: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      cpf: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      country_code: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      privacy_policy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      accept_terms: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      is_reset_password: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      last_password_change: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      stripe_account_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      chave_pix: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      balance: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.0,
      },
      last_payout: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      coupon_code: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      partner_code: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("user", ["email"], {
      name: "idx_user_email",
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("user");
  },
};
