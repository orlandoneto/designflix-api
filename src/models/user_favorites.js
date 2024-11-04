module.exports = (sequelize, DataTypes) => {
  const UserFavorites = sequelize.define(
    "UserFavorites",
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
      user_main_grid_id: {
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
