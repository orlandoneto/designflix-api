module.exports = (sequelize, DataTypes) => {
  const Tags = sequelize.define(
    "Tags",
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
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "tags",
    }
  );

  Tags.associate = function (models) {
    Tags.hasMany(models.UserMainGridTags, {
      foreignKey: "tag_id",
      as: 'tag',
    });
  };

  return Tags;
};
