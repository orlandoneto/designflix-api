module.exports = (sequelize, DataTypes) => {
  const Tema_categories = sequelize.define(
    'Tema_categories', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      id_tema: {
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
      tableName: 'tema_categories'
    }
  );

  Tema_categories.associate = function(models) {
    Tema_categories.belongsTo(models.Tema, {
      foreignKey: 'id_tema'
    }),
    Tema_categories.belongsTo(models.ProductCategory, {
      foreignKey: 'id_category'
    })
  };
  return Tema_categories;
};
