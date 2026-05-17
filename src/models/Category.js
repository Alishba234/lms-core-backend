
// const { DataTypes } = require("sequelize");

// module.exports = (sequelize) => {
//   const Category = sequelize.define(
//     "Category",
//     {
//         id: {
//       type: DataTypes.INTEGER,
//       primaryKey: true,
//       autoIncrement: true // ✅ FIXED
//     },
     

//       name: {
//         type: DataTypes.STRING,
//         allowNull: false,
//         unique: true,
//       },

//       description: {
//         type: DataTypes.TEXT,
//         allowNull: true,
//       },

//       isActive: {
//         type: DataTypes.BOOLEAN,
//         defaultValue: true,
//       },
//     },
//     {
//       tableName: "categories",
//       timestamps: true,
//       paranoid: true,
//       indexes: [
        
//         {
//           fields: ["isActive"],
//         },
//       ],
//     }
//   );

//   return Category;
// };




const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Category = sequelize.define('Category', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true // ✅ FIXED
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [2, 100]
      }
    },
    slug: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
   
    icon: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    
  }, {
    tableName: 'categories',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        unique: true,
        fields: ['slug']
      },
     
      {
        fields: ['isActive']
      },
      {
        fields: ['order']
      }
    ]
  });

  return Category;
};