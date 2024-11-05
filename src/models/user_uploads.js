module.exports = (sequelize, DataTypes) => {
  const UserUploads = sequelize.define(
    "UserUploads",
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
      total_uploads: {
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
      tableName: "user_uploads",
    }
  );

  UserUploads.associate = function (models) {
    UserUploads.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    }),
      UserUploads.belongsTo(models.Admin, {
        foreignKey: "admin_id",
        as: "admin",
      });
  };

  return UserUploads;
};
