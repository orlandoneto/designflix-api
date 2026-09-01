require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const mysql = require("mysql2/promise");

const dbName = process.env.DB_DATABASE || "designflix";

async function resetAndCreateDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
  });

  await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
  await connection.query(
    `CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await connection.end();
  console.log(`Banco '${dbName}' recriado do zero.`);
}

resetAndCreateDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Erro ao criar banco:", error.message);
    process.exit(1);
  });
