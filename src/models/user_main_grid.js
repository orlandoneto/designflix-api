module.exports = (sequelize, DataTypes) => {
  const UserMainGrid = sequelize.define(
    "UserMainGrid",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      admin_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      format: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      url_thumb: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      url_cover: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      url: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      favorite: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      follow_design: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      count_download: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      terms: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      reason: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      activite: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
      tableName: "user_main_grid",
    }
  );

  UserMainGrid.associate = function (models) {
    UserMainGrid.hasMany(models.UserMainGridCategories, {
      foreignKey: "user_main_grid_id",
      as: "user_main_grid_categories",
    }),
      UserMainGrid.hasMany(models.UserMainGridTags, {
        foreignKey: "user_main_grid_id",
        as: "user_main_grid_tags",
      }),
      UserMainGrid.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });
  };

  return UserMainGrid;
};
