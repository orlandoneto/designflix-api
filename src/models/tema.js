module.exports = (sequelize, DataTypes) => {
  const Tema = sequelize.define(
    "Tema",
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
      pre_requisito_opcional: {
        type: DataTypes.TEXT
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
    },{
      tableName: 'temas'
    }
  );
  
  Tema.associate = function(models) {
    Tema.hasMany(models.Tema_categories, {
      foreignKey: 'id_tema'
    }),
    Tema.hasMany(models.TemaRequisito, {
      foreignKey: 'id_tema'
    })
  };
  return Tema;
};