module.exports = (sequelize, DataTypes) => {
  const UserPartners = sequelize.define(
    "UserPartners",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "user_id",
        references: {
          model: "user",
          key: "id",
        },
      },
      partnerId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "partner_id",
        references: {
          model: "partners",
          key: "id",
        },
      },
      startPartner: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "start_partner",
      },
      endPartner: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "end_partner",
      },
      active: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
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
      tableName: "users_partners",
    }
  );

  UserPartners.associate = function (models) {
    UserPartners.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
    });
    UserPartners.belongsTo(models.Partners, {
      foreignKey: "partnerId",
      as: "partner",
    });
  };

  return UserPartners;
};
