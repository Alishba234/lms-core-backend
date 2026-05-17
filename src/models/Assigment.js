const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Assignment = sequelize.define('Assignment', {
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
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    instructions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    maxScore: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
      validate: {
        min: 1
      }
    },
    passingScore: {
      type: DataTypes.INTEGER,
      defaultValue: 60,
      validate: {
        min: 0,
        max: 100
      }
    },
    allowedAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      validate: {
        min: 1
      }
    },
    isRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    attachmentUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
   courseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'courses',
        key: 'id'
      }
    },
    lectureId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'lectures',
        key: 'id'
      }
    }
  }, {
    tableName: 'assignments',
    timestamps: true,
    indexes: [
      {
        fields: ['courseId']
      },
      {
        fields: ['lectureId']
      },
      {
        fields: ['dueDate']
      },
      {
        fields: ['isPublished']
      },
      {
        fields: ['courseId', 'dueDate']
      }
    ]
  });

  return Assignment;
};