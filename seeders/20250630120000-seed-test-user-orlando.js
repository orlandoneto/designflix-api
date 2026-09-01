"use strict";

const bcrypt = require("bcrypt");

const TEST_USER_EMAIL = "orlando@test.com";
const TEST_USER_PASSWORD = "12345678";

module.exports = {
  up: async (queryInterface) => {
    const [existingUsers] = await queryInterface.sequelize.query(
      "SELECT id FROM `user` WHERE email = ? LIMIT 1",
      { replacements: [TEST_USER_EMAIL] }
    );

    if (existingUsers.length) {
      return;
    }

    const hashedPassword = bcrypt.hashSync(
      TEST_USER_PASSWORD,
      bcrypt.genSaltSync(10)
    );

    return queryInterface.bulkInsert("user", [
      {
        id: 1,
        name: "Orlando",
        email: TEST_USER_EMAIL,
        password: hashedPassword,
        contributor: 0,
        phone: "11999999999",
        country_code: 55,
        privacy_policy: 1,
        accept_terms: 1,
        status: "CACTIVE",
        is_reset_password: 0,
        balance: 0,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  down: async (queryInterface) => {
    return queryInterface.bulkDelete("user", { email: TEST_USER_EMAIL }, {});
  },
};
