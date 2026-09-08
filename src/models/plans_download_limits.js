module.exports = (sequelize, DataTypes) => {
  const PlansDownloadLimits = sequelize.define(
    "PlansDownloadLimits",
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
      current_count_downloads: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      monthly_count_downloads: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      // Janela do contador mensal (`YYYY-MM`): sem ela não se sabe se o número
      // é do mês corrente ou sobrou de um mês antigo.
      monthly_period: {
        type: DataTypes.STRING(7),
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
        allowNull: true,
        defaultValue: null,
      },
    },
    {
      tableName: "plans_download_limits",
      timestamps: true,
      underscored: true,
    }
  );

  PlansDownloadLimits.associate = function (models) {
    PlansDownloadLimits.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
      onDelete: "NO ACTION",
      onUpdate: "CASCADE",
    });
  };

  return PlansDownloadLimits;
};
