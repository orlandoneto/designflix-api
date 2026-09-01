require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const { sequelize } = require("../src/models");

sequelize
  .sync()
  .then(() => {
    console.log("Tabelas dos models sincronizadas (apenas as que faltavam).");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Erro ao sincronizar models:", error.message);
    process.exit(1);
  });
