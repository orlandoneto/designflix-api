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
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      url: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      favorite: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      follow_design: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      count_download: {
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
      tableName: "user_main_grid",
    }
  );

  UserMainGrid.associate = function (models) {
    UserMainGrid.belongsTo(models.User, {
      foreignKey: "user_id",
    }),
      UserMainGrid.belongsTo(models.Admin, {
        foreignKey: "admin_id",
      });
    UserMainGrid.belongsTo(models.Category, {
      foreignKey: "category_id",
    });
  };

  return UserMainGrid;
};
