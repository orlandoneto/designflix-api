module.exports = (sequelize, DataTypes) => {
  const UserBugReports = sequelize.define(
    "UserBugReports",
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
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
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
      tableName: "user_bug_reports",
    }
  );

  UserBugReports.associate = function (models) {
    UserBugReports.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
  };

  return UserBugReports;
};
