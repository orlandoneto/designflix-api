module.exports = (sequelize, DataTypes) => {
  const UserInvoiceProduct = sequelize.define(
    "UserInvoiceProduct",
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
      user_invoice_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
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
      tableName: "user_invoice_product",
    }
  );

  UserInvoiceProduct.associate = function(models) {
    UserInvoiceProduct.belongsTo(models.ProductCategory, {
      foreignKey: 'product_id'
    }),
    UserInvoiceProduct.belongsTo(models.UserInvoice, {
      foreignKey: 'user_invoice_id'
    })
  };

  return UserInvoiceProduct;
};
