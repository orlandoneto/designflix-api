module.exports = (sequelize, DataTypes) => {
  const Treinamento_categories = sequelize.define(
    'Treinamento_categories', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      id_treinamento: {
        type:DataTypes.INTEGER,
        allowNull:false
      },
      id_category: {
        type:DataTypes.INTEGER,
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
      tableName: 'treinamento_categories'
    }
  );

  Treinamento_categories.associate = function(models) {
    Treinamento_categories.belongsTo(models.Treinamento, {
      foreignKey: 'id_treinamento'
    }),
    Treinamento_categories.belongsTo(models.ProductCategory, {
      foreignKey: 'id_category'
    })
  };
  return Treinamento_categories;
};
