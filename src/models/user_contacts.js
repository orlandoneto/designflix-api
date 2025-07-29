module.exports = (sequelize, DataTypes) => {
  const UserFavorites = sequelize.define(
    "UserContacts",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      email: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      payment_method_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      reason: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      message: {
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
      tableName: "user_favorites",
    }
  );

  UserFavorites.associate = function (models) {
    UserFavorites.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    }),
      UserFavorites.belongsTo(models.UserMainGrid, {
        foreignKey: "user_main_grid_id",
        as: "user_main_grid",
      });
  };

  return UserFavorites;
};
