const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Section = sequelize.define('Section', {

     id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true // ✅ FIXED
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [3, 200]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    totalDuration: {
      type: DataTypes.INTEGER, // in minutes
      defaultValue: 0
    },
    totalLectures: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    courseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'courses',
        key: 'id'
      }
    }
  }, {
    tableName: 'sections',
    timestamps: true,
    indexes: [
      {
        fields: ['courseId']
      },
      {
        fields: ['order']
      },
      {
        unique: true,
        fields: ['courseId', 'order']
      },
      {
        fields: ['isPublished']
      }
    ]
  });

  return Section;
};