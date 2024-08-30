/* eslint-disable no-param-reassign */
const bcrypt = require("bcrypt");

module.exports = (sequelize, DataTypes) => {
  const Installer = sequelize.define(
    "Installer",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
      },
      fantasy: {
        type: DataTypes.STRING,
      },
      razao_social: {
        type: DataTypes.STRING,
      },
      photo: {
        type: DataTypes.STRING,
      },
      documentPhoto: {
        type: DataTypes.STRING,
        field: "document_photo",
      },
      email: {
        type: DataTypes.STRING,
      },
      password: {
        type: DataTypes.STRING,
      },
      documento: {
        type: DataTypes.STRING,
      },
      phone: {
        type: DataTypes.STRING,
      },
      stateRegistration: {
        type: DataTypes.STRING,
        field: "state_registration",
      },
      lat: {
        type: DataTypes.STRING,
      },
      long: {
        type: DataTypes.STRING,
      },
      isResetPassword: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "is_reset_password",
        allowNull: false,
      },
      postalCode: {
        field: "postal_code",
        type: DataTypes.INTEGER,
      },
      street: {
        type: DataTypes.STRING,
      },
      number: {
        type: DataTypes.INTEGER,
      },
      complement: {
        type: DataTypes.STRING,
      },
      district: {
        type: DataTypes.STRING,
      },
      city: {
        type: DataTypes.STRING,
      },
      state: {
        type: DataTypes.STRING,
      },
      country: {
        type: DataTypes.STRING,
        defaultValue: "BR",
      },
      statusMessage: {
        type: DataTypes.STRING,
        field: "statusMessage",
      },
      status: {
        type: DataTypes.ENUM,
        values: ["APEND", "BFIX", "CACTIVE"],
      },
      bank_bank: {
        type: DataTypes.STRING,
        defaultValue: null,
        allowNull: true
      },
      bank_number: {
        type: DataTypes.INTEGER,
        defaultValue: null,
        allowNull: true
      },
      bank_agency: {
        type: DataTypes.INTEGER,
        defaultValue: null,
        allowNull: true
      },
      bank_name: {
        type: DataTypes.STRING,
        defaultValue: null,
        allowNull: true
      },
      bank_documento: {
        type: DataTypes.STRING,
        defaultValue: null,
        allowNull: true
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
      tableName: "installer",
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

  Installer.associate = function(models) {
    Installer.hasMany(models.Installer_categories, {
      foreignKey: 'id_installer'
    }),
    Installer.hasMany(models.Inscricao_treinamento, {
      foreignKey: 'id_instalador'
    })
  };

  return Installer;
};
