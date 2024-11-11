module.exports = (sequelize, DataTypes) => {
  const UserFollows = sequelize.define(
    "UserFollows",
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
      contributor_image_admin_id: {
        type: DataTypes.INTEGER,
      },
      contributor_image_user_id: {
        type: DataTypes.INTEGER,
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
      tableName: "user_follows",
    }
  );

  UserFollows.associate = function (models) {
    UserFollows.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
  };

  return UserFollows;
};
