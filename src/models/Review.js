const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Review = sequelize.define('Review', {
   id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true // ✅ FIXED
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5
      }
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [10, 2000]
      }
    },
    isVerifiedPurchase: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isApproved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    helpful: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    reported: {
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
    courseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'courses',
        key: 'id'
      }
    }
  }, {
    tableName: 'reviews',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'courseId']
      },
      {
        fields: ['courseId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['rating']
      },
      {
        fields: ['isApproved']
      },
      {
        fields: ['courseId', 'rating']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  return Review;
};