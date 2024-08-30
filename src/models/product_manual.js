module.exports = (sequelize, DataTypes) => {
  const ProductManual = sequelize.define(
    "ProductManual",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,        
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      photo: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "photo",
      },
      createdAt: {
        type: DataTypes.DATE,
        field: "createdAt",
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        field: "updatedAt",
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "product_manual",
    }
  );

  ProductManual.associate = function(models) {
    ProductManual.belongsTo(models.ProductCategory, {
      foreignKey: 'product_id'
    })
  };

  return ProductManual;
};
