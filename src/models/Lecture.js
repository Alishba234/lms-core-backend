const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Lecture = sequelize.define('Lecture', {
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
    type: {
      type: DataTypes.ENUM('video', 'article', 'quiz', 'assignment', 'resource'),
      defaultValue: 'video'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    videoUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    videoDuration: {
      type: DataTypes.INTEGER, // in seconds
      defaultValue: 0
    },
    resourceUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    resourceFile: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    isPreview: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    sectionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'sections',
        key: 'id'
      }
    }
  }, {
    tableName: 'lectures',
    timestamps: true,
    indexes: [
      {
        fields: ['sectionId']
      },
      {
        fields: ['order']
      },
      {
        unique: true,
        fields: ['sectionId', 'order']
      },
      {
        fields: ['type']
      },
      {
        fields: ['isPublished']
      },
      {
        fields: ['isPreview']
      }
    ]
  });

  return Lecture;
};