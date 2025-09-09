module.exports = (sequelize, DataTypes) => {
  const LandingPage = sequelize.define(
    "LandingPage",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      videoUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "video_url",
      },
      imageUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "image_url",
      },
      ctaText: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "cta_text",
      },
      ctaLink: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "cta_link",
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "user_id",
      },
      trackingCode: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "tracking_code",
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
      tableName: "landing_pages",
    }
  );

  LandingPage.associate = function (models) {
    LandingPage.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };

  return LandingPage;
};


