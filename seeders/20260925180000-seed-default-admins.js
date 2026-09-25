"use strict";

const bcrypt = require("bcrypt");
const {
  listDefaultAdmins,
  resolveSeedPassword,
} = require("../src/services/admin/default-admins");

/**
 * Seed idempotente dos admins padrão de produção.
 * - Cria se o e-mail não existir
 * - Atualiza senha/nome/super_admin se já existir (re-seed reseta acesso)
 *
 * Override opcional: ADMIN_SEED_PASSWORD no .env
 */
module.exports = {
  async up(queryInterface) {
    const password = resolveSeedPassword();
    const hashed = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
    const now = new Date();
    const admins = listDefaultAdmins();

    for (const admin of admins) {
      const [existing] = await queryInterface.sequelize.query(
        "SELECT id FROM `admin` WHERE email = ? LIMIT 1",
        { replacements: [admin.email] }
      );

      if (existing.length) {
        await queryInterface.bulkUpdate(
          "admin",
          {
            name: admin.name,
            password: hashed,
            super_admin: admin.super_admin ? 1 : 0,
            is_reset_password: 0,
            updated_at: now,
          },
          { email: admin.email }
        );
        continue;
      }

      await queryInterface.bulkInsert("admin", [
        {
          name: admin.name,
          email: admin.email,
          password: hashed,
          is_reset_password: 0,
          super_admin: admin.super_admin ? 1 : 0,
          created_at: now,
          updated_at: now,
        },
      ]);
    }
  },

  async down(queryInterface) {
    const emails = listDefaultAdmins().map((a) => a.email);
    await queryInterface.bulkDelete("admin", { email: emails }, {});
  },
};
