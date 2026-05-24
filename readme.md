<div align="center">
  <h1>📚 LMS Backend | Enterprise Learning Management System</h1>
  <p><strong>Scalable • Secure • Production-Ready REST API</strong></p>
  <p>
    <img src="https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/Express.js-4.x-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js" />
    <img src="https://img.shields.io/badge/MySQL-8.x-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL" />
    <img src="https://img.shields.io/badge/Sequelize-6.x-52B0E7?style=for-the-badge&logo=sequelize&logoColor=white" alt="Sequelize" />
    <img src="https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=json-web-tokens&logoColor=white" alt="JWT" />
    <img src="https://img.shields.io/badge/Stripe-Payments-008CDD?style=for-the-badge&logo=stripe&logoColor=white" alt="Stripe" />
    <img src="https://img.shields.io/badge/Cloudinary-Uploads-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white" alt="Cloudinary" />
  </p>
  <p>
    <img src="https://img.shields.io/badge/status-production-brightgreen?style=flat-square" alt="Status" />
    <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" />
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs Welcome" />
  </p>
</div>

## 📖 Project Description

**LMS Backend** is a fully-featured, production-ready REST API for online learning platforms. Built with Node.js and Express, it powers complete e-learning ecosystems with role-based access for Students, Instructors, and Admins. The system handles everything from course creation and student enrollment to payments, certifications, and assignment submissions — all with enterprise-grade security and performance.

This backend is ideal for ed-tech startups, universities, or any organization wanting to launch a scalable learning platform.

## ✨ Key Features

| Category | Features |
|----------|----------|
| **🔐 Authentication** | JWT-based auth, role-based access (Student/Instructor/Admin), password hashing, email verification |
| **📚 Course Management** | Create, update, delete courses; organize with categories, sections, and lectures; video/image uploads |
| **👨‍🏫 Instructor Dashboard** | Manage own courses, track enrollments, grade assignments, view earnings |
| **🎓 Student Experience** | Browse courses, enroll via payment, track progress, submit assignments, leave reviews/ratings |
| **📝 Assignment System** | Create/update assignments, file submissions, auto due dates, grading with feedback |
| **💳 Payment Integration** | Stripe checkout, payment intents, webhooks, automatic enrollment after successful payment, refund handling |
| **⭐ Review & Rating** | Rate courses (1-5 stars), write reviews, average rating calculation per course |
| **📜 Certificate Generation** | Auto-generate PDF certificates upon course completion |
| **☁️ File Uploads** | Cloudinary integration for lectures, assignments, profile pictures, and certificates |
| **📧 Email Notifications** | Nodemailer for welcome emails, payment confirmations, assignment reminders, certificate delivery |
| **🛡️ Security** | Helmet, rate limiting, CORS, input sanitization, SQL injection prevention (Sequelize), XSS protection |
| **⚡ Performance** | Database indexing, pagination, query optimization, lazy loading, connection pooling |

## 🧰 Tech Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js (v20+) |
| **Framework** | Express.js (v4) |
| **Database** | MySQL (v8) |
| **ORM** | Sequelize (v6) |
| **Auth** | JSON Web Tokens + bcrypt |
| **File Upload** | Multer + Cloudinary |
| **Payments** | Stripe API + Webhooks |
| **Email** | Nodemailer (SMTP) |
| **Validation** | express-validator |
| **Security** | Helmet, CORS, express-rate-limit |
| **Dev Tools** | Nodemon, Dotenv, Morgan |

## 🏗️ Project Architecture

The project follows the **MVC (Model-View-Controller)** pattern with a clean separation of concerns:

- **Controllers** – Business logic and request handling
- **Models** – Database schema definitions and associations
- **Middleware** – Authentication, role checks, file upload, error handling
- **Routes** – API endpoint definitions
- **Utils** – Reusable helpers (email, cloudinary, stripe, JWT)
- **Config** – Environment-specific configurations
- **Uploads** – Temporary local storage (processed and moved to Cloudinary)

## 🗄️ Database Models & Relationships

| Model | Attributes | Relationships |
|-------|------------|---------------|
| **User** | id, name, email, password, role (student/instructor/admin), avatar, bio | hasMany Course (as instructor), hasMany Enrollment, hasMany Review, hasMany Submission |
| **Category** | id, name, slug, description | hasMany Course |
| **Course** | id, title, description, price, thumbnail, level, status, instructorId, categoryId | belongsTo Category, belongsTo User (instructor), hasMany Section, hasMany Enrollment, hasMany Review |
| **Section** | id, title, order, courseId | belongsTo Course, hasMany Lecture |
| **Lecture** | id, title, videoUrl, duration, isFree, order, sectionId | belongsTo Section |
| **Enrollment** | id, userId, courseId, progress, completedAt, certificateUrl | belongsTo User, belongsTo Course |
| **Review** | id, rating, comment, userId, courseId | belongsTo User, belongsTo Course |
| **Payment** | id, amount, currency, status, stripePaymentId, userId, courseId | belongsTo User, belongsTo Course |
| **Assignment** | id, title, description, dueDate, maxScore, courseId | belongsTo Course, hasMany Submission |
| **Submission** | id, content, fileUrl, score, feedback, submittedAt, assignmentId, userId | belongsTo Assignment, belongsTo User |

### Key Associations

```javascript
// Example: Course - Instructor relationship
Course.belongsTo(User, { as: 'instructor', foreignKey: 'instructorId' });
User.hasMany(Course, { as: 'taughtCourses', foreignKey: 'instructorId' });

// Many-to-many through Enrollment
User.belongsToMany(Course, { through: Enrollment });
Course.belongsToMany(User, { through: Enrollment });
