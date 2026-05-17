const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Submission = sequelize.define('Submission', {
      id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true // ✅ FIXED
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    attachmentUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    score: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0
      }
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('draft', 'submitted', 'graded', 'late', 'resubmitted'),
      defaultValue: 'draft'
    },
    attemptNumber: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      validate: {
        min: 1
      }
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    gradedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isLate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    assignmentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'assignments',
        key: 'id'
      }
    }
  }, {
    tableName: 'submissions',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'assignmentId', 'attemptNumber']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['assignmentId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['submittedAt']
      },
      {
        fields: ['assignmentId', 'status']
      }
    ]
  });

  return Submission;
};