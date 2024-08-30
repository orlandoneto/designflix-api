module.exports = (sequelize, DataTypes) => {
    const Treinamento_requisito = sequelize.define(
      "Treinamento_requisito",
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        id_treinamento: {
            type: DataTypes.INTEGER
        },
        id_tema_requisito: {
            type: DataTypes.INTEGER
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },{
        tableName: 'treinamento_requisitos'
      }
    );

    Treinamento_requisito.associate = function(models) {
        Treinamento_requisito.belongsTo(models.Treinamento, {
            foreignKey: 'id_treinamento'
        }),
        Treinamento_requisito.belongsTo(models.Tema, {
          foreignKey: 'id_tema_requisito'
        })
    };
  

    return Treinamento_requisito;
  };