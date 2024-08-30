module.exports = (sequelize, DataTypes) => {
  const ProductCategory = sequelize.define(
    "ProductCategory",
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
      url_icon: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        field: "created_at",
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        field: "updated_at",
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "product_category",
    }
  );

  
  ProductCategory.associate = function(models) {
    ProductCategory.hasMany(models.ProductManual, {
      foreignKey: 'product_id'
    }),
    ProductCategory.hasMany(models.ProductVideo, {
      foreignKey: 'product_id'
    }),
    ProductCategory.hasOne(models.UserInvoiceProduct, {
      foreignKey: 'product_id'
    })
  };


  return ProductCategory;
};
