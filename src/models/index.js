'use strict';
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// User -> Course
db.User.hasMany(db.Course, {
  foreignKey: "instructorId",
  as: "courses",
});

db.Course.belongsTo(db.User, {
  foreignKey: "instructorId",
  as: "instructor",
});

// Category -> Course
db.Category.hasMany(db.Course, {
  foreignKey: "categoryId",
  as: "courses",
});

db.Course.belongsTo(db.Category, {
  foreignKey: "categoryId",
  as: "category",
});

db.Course.hasMany(db.Section, {
  foreignKey: "courseId",
  as: "sections",
  onDelete: "CASCADE"
});

db.Section.belongsTo(db.Course, {
  foreignKey: "courseId",
  as: "courses"
});

// Section -> Lecture
db.Section.hasMany(db.Lecture, {
  foreignKey: "sectionId",
  as: "lectures",
  onDelete: "CASCADE"
});

db.Lecture.belongsTo(db.Section, {
  foreignKey: "sectionId",
  as: "section"
});
// User has many Reviews
db.User.hasMany(db.Review, {
  foreignKey: "userId",
  as: "reviews",
  onDelete: 'CASCADE'
});
db.Review.belongsTo(db.User, {
  foreignKey: "userId",
  as: "user"
});
// Course has many Reviews
db.Course.hasMany(db.Review, {
  foreignKey: "courseId",
  as: "reviews",
    onDelete: 'CASCADE'
});
db.Review.belongsTo(db.Course, {
  foreignKey: "courseId",
  as: "course" // ✔ same alias jo tum use kar rahe ho
});
db.User.hasMany(db.Enrollment, {
  foreignKey: "userId",
  as: "enrollments",
  onDelete: "CASCADE"
});

db.Enrollment.belongsTo(db.User, {
  foreignKey: "userId",
  as: "user"
});
db.Course.hasMany(db.Enrollment, {
  foreignKey: "courseId",
  as: "enrollments",
  onDelete: "CASCADE"
});

db.Enrollment.belongsTo(db.Course, {
  foreignKey: "courseId",
  as: "course"
});
db.Payment.hasMany(db.Enrollment, {
  foreignKey: "paymentId",
  as: "enrollments",
  onDelete: "SET NULL" // important
});

// Enrollment belongs to Payment
db.Enrollment.belongsTo(db.Payment, {
  foreignKey: "paymentId",
  as: "payment"
});
// USER → PAYMENT
db.User.hasMany(db.Payment, {
  foreignKey: "userId",
  as: "payments"
});

db.Payment.belongsTo(db.User, {
  foreignKey: "userId",
  as: "user"
});
// COURSE → PAYMENT
db.Course.hasMany(db.Payment, {
  foreignKey: "courseId",
  as: "payments"
});

db.Payment.belongsTo(db.Course, {
  foreignKey: "courseId",
  as: "course"
});
db.User.hasMany(db.Submission, {
  foreignKey: "userId",
  as: "submissions"
});
db.Assignment.hasMany(db.Submission, {
  foreignKey: "assignmentId",
  as: "submissions"
});
db.Submission.belongsTo(db.User, {
  foreignKey: "userId",
  as: "user"
});

db.Submission.belongsTo(db.Assignment, {
  foreignKey: "assignmentId",
  as: "assignment"
});
db.Course.hasMany(db.Assignment, {
  foreignKey: "courseId",
  as: "assignments"
});
db.Lecture.hasMany(db.Assignment, {
  foreignKey: "lectureId",
  as: "assignments"
});
db.Assignment.belongsTo(db.Course, {
  foreignKey: "courseId",
  as: "course"
});

db.Assignment.belongsTo(db.Lecture, {
  foreignKey: "lectureId",
  as: "lecture"
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;

