require("dotenv").config({ path: __dirname + "/./../../.env" });

module.exports = {
  username: process.env.DB_USERNAME || "default_username",
  password: process.env.DB_PASSWORD || "default_password",
  database: process.env.DB_DATABASE || "default_database",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  dialect: "mysql",
  logging: process.env.DB_LOGGING === "true" ? console.log : false,
};
