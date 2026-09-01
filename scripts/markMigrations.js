require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const fs = require("fs");
const path = require("path");
const { sequelize } = require("../src/models");

const migrationsDir = path.resolve(__dirname, "../migrations");

async function markMigrations() {
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".js"))
    .sort();

  const queryInterface = sequelize.getQueryInterface();
  await queryInterface.createTable("SequelizeMeta", {
    name: {
      type: sequelize.Sequelize.STRING,
      allowNull: false,
      unique: true,
      primaryKey: true,
    },
  }).catch(() => {});

  for (const file of files) {
    await sequelize.query(
      "INSERT IGNORE INTO `SequelizeMeta` (`name`) VALUES (?)",
      { replacements: [file] }
    );
  }

  console.log(`${files.length} migrations registradas em SequelizeMeta.`);
}

markMigrations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Erro ao registrar migrations:", error.message);
    process.exit(1);
  });
