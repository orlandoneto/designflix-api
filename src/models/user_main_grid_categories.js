module.exports = (sequelize, DataTypes) => {
  const UserMainGridCategories = sequelize.define(
    "UserMainGridCategories",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_main_grid_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      category_id: {
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
      tableName: "user_main_grid_categories",
    }
  );

  UserMainGridCategories.associate = function (models) {
    UserMainGridCategories.belongsTo(models.Category, {
      foreignKey: "category_id",
      as: "category",
    }),
      UserMainGridCategories.belongsTo(models.UserMainGrid, {
        foreignKey: "user_main_grid_id",
        as: "user_main_grid",
      });
  };

  return UserMainGridCategories;
};
