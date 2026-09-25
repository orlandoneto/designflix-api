/**
 * Assinatura no Asaas — tabela exclusiva do módulo.
 *
 * O vínculo com o gateway não fica em `user_plans` de propósito: `user_plans`
 * é o direito de acesso (agnóstico), esta tabela é o espelho do que existe no
 * Asaas. Trocar/adicionar gateway no futuro não mexe na tabela compartilhada.
 */
module.exports = (sequelize, DataTypes) => {
  const AsaasSubscription = sequelize.define(
    "AsaasSubscription",
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
      plan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      /** `cus_...` devolvido pelo Asaas. */
      asaas_customer_id: {
        type: DataTypes.STRING(60),
        allowNull: false,
      },
      /** `sub_...` devolvido pelo Asaas. Único. */
      asaas_subscription_id: {
        type: DataTypes.STRING(60),
        allowNull: false,
      },
      /** CREDIT_CARD | PIX | BOLETO (legado) | UNDEFINED */
      asaas_billing_type: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      /** MONTHLY | YEARLY */
      asaas_cycle: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      /** ACTIVE | INACTIVE | EXPIRED — espelho do status no Asaas. */
      asaas_status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
      /** Guardado em centavos; o Asaas trabalha em reais decimais. */
      asaas_value_cents: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      asaas_next_due_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
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
      tableName: "asaas_subscriptions",
    }
  );

  AsaasSubscription.associate = function associate(models) {
    if (models.User) {
      AsaasSubscription.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });
    }
    if (models.Plans) {
      AsaasSubscription.belongsTo(models.Plans, {
        foreignKey: "plan_id",
        as: "plan",
      });
    }
  };

  return AsaasSubscription;
};
