module.exports = (sequelize, DataTypes) => {
  const Plans = sequelize.define(
    "Plans",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      stripe_price_id: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      plan_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      count_downloads: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      partner_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'partners',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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
      tableName: "plans",
    }
  );

  Plans.associate = function (models) {
    if (models.UsePlans) {
      Plans.hasMany(models.UsePlans, {
        foreignKey: "plan_id",
      });
    }

    if (models.Partners) {
      Plans.belongsTo(models.Partners, {
        foreignKey: "partner_id",
        as: "partner",
        onDelete: "SET NULL",
        onUpdate: "CASCADE"
      });
    }
  };

  return Plans;
};
