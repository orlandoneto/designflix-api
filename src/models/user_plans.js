module.exports = (sequelize, DataTypes) => {
  const UserPlans = sequelize.define(
    "UserPlans",
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
      plan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      stripe_customer_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      stripe_subscription_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      mercadopago_customer_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      subscription_days_left: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      scheduled_plan_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      scheduled_plan_start_at: {
        type: DataTypes.DATE,
        allowNull: true,
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
      tableName: "user_plans",
    }
  );

  UserPlans.associate = function (models) {
    UserPlans.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    }),
      UserPlans.belongsTo(models.Plans, {
        foreignKey: "plan_id",
        as: "plans",
      });
  };

  return UserPlans;
};
