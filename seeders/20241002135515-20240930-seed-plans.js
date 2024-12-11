"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert("plans", [
      {
        id: 1,
        stripe_plan_id: "price_1QUDYw2NtYxAX2BEesXpLqCw",
        plan_name: "free",
        count_downloads: 1,
        current_count_downloads: 0,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 2,
        stripe_plan_id: "price_1QUDZj2NtYxAX2BE5NL5u6Dy",
        plan_name: "monthly",
        count_downloads: 5,
        current_count_downloads: 0,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 3,
        stripe_plan_id: "price_1QUDaF2NtYxAX2BEKXJa2R5H",
        plan_name: "semi_annual",
        count_downloads: 10,
        current_count_downloads: 0,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 4,
        stripe_plan_id: "price_1QUDah2NtYxAX2BEom1775Yr",
        plan_name: "annual",
        count_downloads: 15,
        current_count_downloads: 0,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 1,
        stripe_plan_id: "price_1QU7FT2NtYxAX2BEjfkIEzUX",
        plan_name: "free",
        count_downloads: 1,
        current_count_downloads: 0,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 2,
        stripe_plan_id: "price_1QU7GA2NtYxAX2BEFWyuKiV5",
        plan_name: "monthly",
        count_downloads: 5,
        current_count_downloads: 0,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 3,
        stripe_plan_id: "price_1QU7HG2NtYxAX2BE8tDxRE7B",
        plan_name: "semi_annual",
        count_downloads: 10,
        current_count_downloads: 0,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 4,
        stripe_plan_id: "price_1QU7I02NtYxAX2BEu9jKkmfE",
        plan_name: "annual",
        count_downloads: 15,
        current_count_downloads: 0,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete("plans", null, {});
  },
};
