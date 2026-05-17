const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Enrollment = sequelize.define('Enrollment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true // ✅ FIXED
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    courseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'courses',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('active', 'completed', 'dropped', 'suspended'),
      defaultValue: 'active'
    },
    progress: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00,
      validate: {
        min: 0,
        max: 100
      }
    },
    enrolledAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastAccessedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    certificateIssued: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    certificateUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    paymentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'payments',
        key: 'id'
      }
    }
  }, {
    tableName: 'enrollments',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'courseId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['courseId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['enrolledAt']
      },
      {
        fields: ['userId', 'status']
      }
    ]
  });

  return Enrollment;
};