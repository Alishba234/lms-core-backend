const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Course = sequelize.define('Course', {
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
        len: [5, 200]
      }
    },
    slug: {
      type: DataTypes.STRING(220),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [20, 5000]
      }
    },
    shortDescription: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    thumbnail: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    previewVideo: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      validate: {
        min: 0
      }
    },
    discountPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0
      }
    },
    level: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'all levels'),
      defaultValue: 'beginner'
    },
    language: {
      type: DataTypes.STRING(50),
      defaultValue: 'English'
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'archived', 'pending_review'),
      defaultValue: 'draft'
    },
    isFree: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    totalDuration: {
      type: DataTypes.INTEGER, // in minutes
      defaultValue: 0
    },
    totalLectures: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    totalStudents: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    averageRating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0.00,
      validate: {
        min: 0,
        max: 5
      }
    },
    totalReviews: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    requirements: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue:[]
    },
    
  instructorId: {
  type: DataTypes.INTEGER,
  allowNull: false,
  references: {
    model: "users",
    key: "id"
  }
},
   categoryId: {
  type: DataTypes.INTEGER,
  allowNull: false,
  references: {
    model: "categories",
    key: "id"
  }
},
   
    keywords: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    }
  }, {
    tableName: 'courses',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        unique: true,
        fields: ['slug']
      },
      {
        fields: ['instructorId']
      },
      {
        fields: ['categoryId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['level']
      },
      {
        fields: ['isPublished']
      },
      {
        fields: ['price']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['totalStudents']
      },
      {
        fields: ['averageRating']
      },
      {
        fields: ['instructorId', 'status']
      }
    ]
  });

  return Course;
};