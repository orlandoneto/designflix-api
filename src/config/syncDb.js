const syncAllTables = async (sequelize, nameTable) => {
  try {
    sequelize
      .sync({ force: true })
      .then(() => {
        console.log(nameTable + " criada!");
      })
      .catch((err) => {
        console.error("Erro ao criar tabela: ", err);
      });
  } catch (error) {
    console.error("Erro ao sincronizar tabelas:", error);
  }
};

module.exports = syncAllTables;
