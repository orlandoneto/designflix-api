module.exports = (sequelize, DataTypes) => {
    const Installer_categories = sequelize.define(
      'Installer_categories', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        id_installer: {
          type:DataTypes.INTEGER,
          allowNull:false
        },
        id_category: {
          type:DataTypes.INTEGER,
          allowNull:false
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
        }
      }, {
        tableName: 'installer_categories'
      }
    );
  
    Installer_categories.associate = function(models) {
      Installer_categories.belongsTo(models.Installer, {
        foreignKey: 'id_installer'
      }),
      Installer_categories.belongsTo(models.ProductCategory, {
        foreignKey: 'id_category'
      })
    };
    return Installer_categories;
  };
  