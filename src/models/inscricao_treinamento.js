module.exports = (sequelize, DataTypes) => {
    const Inscricao_treinamento = sequelize.define(
      'Inscricao_treinamento', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        id_treinamento: {
          type:DataTypes.INTEGER,
          allowNull:false
        },
        id_instalador: {
          type:DataTypes.INTEGER,
          allowNull:false
        },
        status:{
          type:DataTypes.STRING,
          allowNull:false
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
        }
      }, {
        tableName: 'inscricao_treinamento'
      }
    );
  
    Inscricao_treinamento.associate = function(models) {
        Inscricao_treinamento.belongsTo(models.Treinamento, {
        foreignKey: 'id_treinamento'
      }),
      Inscricao_treinamento.belongsTo(models.Installer, {
        foreignKey: 'id_instalador'
      })
    };
    return Inscricao_treinamento;
  };
  