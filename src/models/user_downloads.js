module.exports = (sequelize, DataTypes) => {
  const UserDownloads = sequelize.define(
    "UserDownloads",
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
      },
      contributor_image_admin_id: {
        type: DataTypes.INTEGER,
      },
      contributor_image_user_id: {
        type: DataTypes.INTEGER,
      },
      total_downloads: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
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
      tableName: "user_downloads",
    }
  );

  UserDownloads.associate = function (models) {
    UserDownloads.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
    UserDownloads.belongsTo(models.UserMainGrid, {
      foreignKey: "user_main_grid_id",
      as: "user_main_grid",
    });
  };

  return UserDownloads;
};
