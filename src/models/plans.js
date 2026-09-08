module.exports = (sequelize, DataTypes) => {
  const Plans = sequelize.define(
    "Plans",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      // Legado do período Stripe. Continua populado para os planos antigos e
      // fica nulo em qualquer plano criado pelo admin daqui em diante.
      stripe_price_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      plan_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      tier: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      display_name: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      price_cents: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: "BRL",
      },
      billing_interval: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: "month",
      },
      features: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
          const raw = this.getDataValue("features");
          if (!raw) return [];
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
          } catch (err) {
            return [];
          }
        },
        set(value) {
          const list = Array.isArray(value) ? value : [];
          this.setDataValue("features", JSON.stringify(list));
        },
      },
      sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      // Onde o plano é cobrado: 'asaas' | 'stripe' | null (plano gratuito).
      gateway: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      count_downloads: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      // Teto mensal do plano pago. Nulo = ilimitado.
      monthly_download_cap: {
        type: DataTypes.INTEGER,
        allowNull: true,
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
