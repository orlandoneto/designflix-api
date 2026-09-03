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
      contributor: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      photo: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      cpf: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      countryCode: {
        type: DataTypes.INTEGER,
        defaultValue: null,
        field: "country_code",
        allowNull: true,
      },
      privacyPolicy: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "privacy_policy",
        allowNull: false,
      },
      acceptTerms: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "accept_terms",
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      isResetPassword: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "is_reset_password",
        allowNull: false,
      },
      lastPasswordChange: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "last_password_change",
        comment: "Data da última alteração de senha - usado para invalidar tokens"
      },
      stripeAccountId: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "stripe_account_id",
      },
      chavePix: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "chave_pix",
      },
      username: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      contributorStatus: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "none",
        field: "contributor_status",
      },
      balance: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
      },
      lastPayout: {
        type: DataTypes.DATE,
        field: "last_payout",
      },
      couponCode: {
        type: DataTypes.STRING(64),
        allowNull: true,
        field: "coupon_code",
      },
      partnerCode: {
        type: DataTypes.STRING(64),
        allowNull: true,
        field: "partner_code",
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
      }),
      User.hasMany(models.UserPlans, {
        foreignKey: "user_id",
      }),
      User.hasMany(models.UserPartners, {
        foreignKey: "userId",
        as: "user_partners",
      }),
      User.hasMany(models.ContributorApplication, {
        foreignKey: "user_id",
      });
  };

  return User;
};
