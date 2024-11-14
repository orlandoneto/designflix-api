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
        defaultValue: null,
      },
    },
    {
      tableName: "plans_download_limits",
    }
  );

  PlansDownloadLimits.associate = function (models) {
    PlansDownloadLimits.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
  };

  return PlansDownloadLimits;
};
