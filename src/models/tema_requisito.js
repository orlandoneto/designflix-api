module.exports = (sequelize, DataTypes) => {
    const TemaRequisito = sequelize.define(
      "TemaRequisito",
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        id_tema: {
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
        tableName: 'temas_requisitos'
      }
    );
    TemaRequisito.associate = function(models) {
      TemaRequisito.belongsTo(models.Tema, {
        as: 'tema_owner',
        foreignKey: {
          name: 'id_tema',
          allowNull: false
        }
      }),
      TemaRequisito.belongsTo(models.Tema, {
        as: 'tema_req',
        foreignKey: {
          name: 'id_tema_requisito',
          allowNull: false
        }
      })
    };

    return TemaRequisito;
  };