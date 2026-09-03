module.exports = (sequelize, DataTypes) => {
  const ContributorApplication = sequelize.define(
    "ContributorApplication",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "user_id",
      },
      portfolioUrl: {
        type: DataTypes.STRING(500),
        allowNull: false,
        field: "portfolio_url",
      },
      instagram: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      behance: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      about: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "pending",
      },
      termsVersion: {
        type: DataTypes.STRING(64),
        allowNull: false,
        field: "terms_version",
      },
      termsAcceptedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "terms_accepted_at",
      },
      reviewedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "reviewed_at",
      },
      reviewedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "reviewed_by",
      },
      reviewNote: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: "review_note",
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
      tableName: "contributor_application",
    }
  );

  ContributorApplication.associate = function (models) {
    ContributorApplication.belongsTo(models.User, {
      foreignKey: "user_id",
    });
  };

  return ContributorApplication;
};
