module.exports = (sequelize, DataTypes) => {
  const UserPayout = sequelize.define(
    "UserPayout",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "user_id",
        references: {
          model: "user",
          key: "id",
        },
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      requestedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "requested_at",
      },
      paidAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "paid_at",
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "created_at",
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "updated_at",
      },
    },
    {
      tableName: "user_payouts",
    }
  );

  UserPayout.associate = (models) => {
    UserPayout.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
  };

  return UserPayout;
};
