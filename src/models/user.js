/* eslint-disable no-param-reassign */
const bcrypt = require("bcrypt");

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      photo: {
        type: DataTypes.STRING,
        field: "photo",
        allowNull: true,
      },
      cpf: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      countryCode: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "country_code",
        allowNull: false,
      },
      privacyPolicy: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "privacy_policy",
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      planType: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "plan_type",
        allowNull: false,
      },
      isResetPassword: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "is_reset_password",
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
      tableName: "user",
      hooks: {
        beforeCreate: async (user) => {
          if (user.password) {
            user.password = await bcrypt.hashSync(
              user.password,
              bcrypt.genSaltSync(10)
            );
          }
          return user;
        },
        beforeUpdate: async (user) => {
          if (user.password) {
            user.password = await bcrypt.hashSync(
              user.password,
              bcrypt.genSaltSync(10)
            );
          }
          return user;
        },
      },
    }
  );

  User.associate = function (models) {
    User.hasMany(models.UserAddress, {
      foreignKey: "user_id",
    }),
      User.hasMany(models.UserCreditCard, {
        foreignKey: "user_id",
      }),
      User.hasMany(models.UserMainGrid, {
        foreignKey: "user_id",
      });
  };

  return User;
};
