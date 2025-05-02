module.exports = (sequelize, DataTypes) => {
  const UserCommission = sequelize.define(
    "UserCommission",
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
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        field: "created_at",
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "user_commissions",
      timestamps: false, 
    }
  );

  UserCommission.associate = function (models) {
    UserCommission.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
  };

  return UserCommission;
};
