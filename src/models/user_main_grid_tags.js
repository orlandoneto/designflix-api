module.exports = (sequelize, DataTypes) => {
  const UserMainGridTags = sequelize.define(
    "UserMainGridTags",
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
      tag_id: {
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
      tableName: "user_main_grid_tags",
    }
  );

  UserMainGridTags.associate = function (models) {
    UserMainGridTags.hasMany(models.UserMainGrid, {
      foreignKey: "user_main_grid_id",
    }),
      UserMainGridTags.hasMany(models.Tags, {
        foreignKey: "tag_id",
      });
  };

  return UserMainGridTags;
};
