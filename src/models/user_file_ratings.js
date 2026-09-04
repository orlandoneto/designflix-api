module.exports = (sequelize, DataTypes) => {
  const UserFileRatings = sequelize.define(
    'UserFileRatings',
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
      user_main_grid_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      score: {
        type: DataTypes.TINYINT,
        allowNull: false,
        validate: {
          min: 1,
          max: 5,
        },
      },
      createdAt: {
        type: DataTypes.DATE,
        field: 'created_at',
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        field: 'updated_at',
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'user_file_ratings',
    }
  );

  UserFileRatings.associate = function (models) {
    UserFileRatings.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });
    UserFileRatings.belongsTo(models.UserMainGrid, {
      foreignKey: 'user_main_grid_id',
      as: 'user_main_grid',
    });
  };

  return UserFileRatings;
};
