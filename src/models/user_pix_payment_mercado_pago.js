module.exports = (sequelize, DataTypes) => {
  const UserPixPaymentMercadoPago = sequelize.define(
    "UserPixPaymentMercadoPago",
    {
      autoId: {
        field: "auto_id",
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: false,
      },
      action: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      apiVersion: {
        field: "api_version",
        type: DataTypes.STRING,
        allowNull: false,
      },
      dataId: {
        field: "data_id",
        type: DataTypes.STRING,
        allowNull: false,
      },
      dateCreated: {
        field: "date_created",
        type: DataTypes.DATE,
        allowNull: false,
      },
      liveMode: {
        field: "live_mode",
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      userPixId: {
        field: "user_id",
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      isCheck: {
        field: "is_check",
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      createdAt: {
        field: "created_at",
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        field: "updated_at",
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "user_pix_payment_mercadopago",
    }
  );

  return UserPixPaymentMercadoPago;
};
