const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Payment = sequelize.define('Payment', {
   id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true // ✅ FIXED
    },
    transactionId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD'
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded', 'cancelled'),
      defaultValue: 'pending'
    },
    paymentMethod: {
      type: DataTypes.ENUM('credit_card', 'debit_card', 'paypal', 'bank_transfer', 'crypto'),
      allowNull: false
    },
    paymentDetails: {
      type: DataTypes.JSON,
      allowNull: true
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    refundedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    refundAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    invoiceUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
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
    tableName: 'payments',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['transactionId']
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
        fields: ['paidAt']
      },
      {
        fields: ['userId', 'status']
      },
      {
        fields: ['courseId', 'status']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  return Payment;
};