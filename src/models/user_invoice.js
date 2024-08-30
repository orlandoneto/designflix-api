module.exports = (sequelize, DataTypes) => {
  const UserInvoice = sequelize.define(
    "UserInvoice",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      cnpj: {
        type: DataTypes.STRING,
      },
      invoice_number: {
        type: DataTypes.STRING,
      },
      invoice_date: {
        type: DataTypes.DATE,
      },
      motor_quantity: {
        type: DataTypes.INTEGER,
      },
      remote_control_quantity: {
        type: DataTypes.INTEGER,
      },
      photo: {
        type: DataTypes.STRING,
      },
      is_active: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      tipo_nota: {
        type: DataTypes.ENUM,
        values: ["revenda", "imovel", "sem_nota"],
        defaultValue: null,
        allowNull: false,
      },
      descricao: {
        type: DataTypes.TEXT,
        defaultValue: '',
        allowNull: false
      },
      termino_garantia:{
        type: DataTypes.DATE,
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
      tableName: "user_invoice",
    }
  );

  UserInvoice.associate = function(models) {
    UserInvoice.hasMany(models.UserInvoiceProduct, {
      foreignKey: 'user_invoice_id'
    })
  };

  return UserInvoice;
};
