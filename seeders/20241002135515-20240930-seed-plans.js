"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert("plans", [
      {
        stripe_plan_id: "price_1Q4X5gRwsZMOomySnlX3nh2M",
        plan_name: "free",
        count_downloads: 1,
        current_count_downloads: 0,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        stripe_plan_id: "price_1Q4X8VRwsZMOomySPJxGDftm",
        plan_name: "monthly",
        count_downloads: 5,
        current_count_downloads: 0,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        stripe_plan_id: "price_1Q4X7KRwsZMOomySmgELmeLB",
        plan_name: "semi_annual",
        count_downloads: 10,
        current_count_downloads: 0,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        stripe_plan_id: "price_1Q4X80RwsZMOomySP5O6yrvt",
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
