"use strict";

/**
 * Tabela de staff do painel (`designflix-admin`).
 * Historicamente vinha só do sequelize.sync — em produção precisa de migration
 * antes de `user_main_grid` (FK admin_id).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const names = tables
      .map((t) => (typeof t === "string" ? t : t.tableName || t.name || ""))
      .map((n) => String(n).toLowerCase());

    if (names.includes("admin")) {
      return;
    }

    await queryInterface.createTable("admin", {
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
      is_reset_password: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      super_admin: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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

    await queryInterface.addIndex("admin", ["email"], {
      name: "idx_admin_email",
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("admin");
  },
};
