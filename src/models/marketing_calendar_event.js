module.exports = (sequelize, DataTypes) => {
  const MarketingCalendarEvent = sequelize.define(
    'MarketingCalendarEvent',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      title: {
        type: DataTypes.STRING(160),
        allowNull: false,
      },
      eventDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'event_date',
      },
      /** Fim da campanha (mês inteiro / período). Null = data única. */
      endDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'end_date',
      },
      icon: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: '📅',
      },
      badge: {
        type: DataTypes.STRING(80),
        allowNull: true,
      },
      categorySlug: {
        type: DataTypes.STRING(120),
        allowNull: false,
        field: 'category_slug',
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'sort_order',
      },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'marketing_calendar_event',
    }
  );

  return MarketingCalendarEvent;
};
