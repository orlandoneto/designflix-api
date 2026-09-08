/**
 * Registro de evento de webhook do Asaas — usado só para idempotência.
 *
 * O Asaas reentrega o evento até receber 200. Sem a trava de unicidade em
 * `asaas_event_id`, reentrega vira e-mail duplicado e acesso concedido duas vezes.
 */
module.exports = (sequelize, DataTypes) => {
  const AsaasWebhookEvent = sequelize.define(
    "AsaasWebhookEvent",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      /** `id` do evento enviado pelo Asaas. Único. */
      asaas_event_id: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      /** PAYMENT_CONFIRMED, PAYMENT_OVERDUE, … */
      asaas_event_name: {
        type: DataTypes.STRING(60),
        allowNull: false,
      },
      asaas_payment_id: {
        type: DataTypes.STRING(60),
        allowNull: true,
      },
      asaas_subscription_id: {
        type: DataTypes.STRING(60),
        allowNull: true,
      },
      asaas_processed_at: {
        type: DataTypes.DATE,
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
      tableName: "asaas_webhook_events",
    }
  );

  return AsaasWebhookEvent;
};
