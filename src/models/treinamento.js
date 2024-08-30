module.exports = (sequelize, DataTypes) => {
  const Treinamento = sequelize.define(
    "Treinamento",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      id_tema: {
        type:DataTypes.INTEGER,
        allowNull:false
      },
      instrutor: {
        type: DataTypes.STRING
      },
      local: {
        type: DataTypes.STRING
      },
      url_treinamento: {
        type: DataTypes.STRING
      },
      pre_requisito_opcional: {
        type: DataTypes.TEXT
      },
      descricao: {
        type: DataTypes.TEXT
      },
      n_vagas: {
        type: DataTypes.INTEGER
      },
      inicio: {
        allowNull: false,
        type: DataTypes.DATE
      },
      hora_inicio: {
        allowNull: false,
        type: DataTypes.STRING
      },
      fim_treinamento: {
        allowNull: false,
        type: DataTypes.DATE
      },
      hora_fim_treinamento: {
        allowNull: false,
        type: DataTypes.STRING
      }, 
      fim: {
        allowNull: false,
        type: DataTypes.DATE
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
      tableName: 'treinamentos'
    }
  )
  Treinamento.associate = function(models) {
    Treinamento.hasMany(models.Treinamento_categories, {
      foreignKey: 'id_treinamento'
    }),
    Treinamento.hasMany(models.Inscricao_treinamento, {
      foreignKey: 'id_treinamento'
    }),
    Treinamento.hasMany(models.Treinamento_requisito, {
      foreignKey: 'id_treinamento'
    })
  };
  return Treinamento;
};