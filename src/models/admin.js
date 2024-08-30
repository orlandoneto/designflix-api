/* eslint-disable no-param-reassign */
const bcrypt = require("bcrypt");

module.exports = (sequelize, DataTypes) => {
  const Admin = sequelize.define(
    "Admin",
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
      isResetPassword: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "is_reset_password",
        allowNull: false,
      },
      super_admin:{
        type: DataTypes.BOOLEAN,
        allowNull: false,
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
      tableName: "admin",
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

  return Admin;
};
