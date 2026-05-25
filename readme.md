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

## 📖 API Endpoints

### 🔐 Authentication APIs

| Method | Endpoint | Description | Access |
| :---: | --- | --- | :---: |
| `POST` | `/api/auth/register` | Register new user | `Public` |
| `POST` | `/api/auth/login` | Login & get JWT token | `Public` |
| `POST` | `/api/auth/logout` | Logout user | `Public` |
| `POST` | `/api/auth/forgot-password` | Send reset email | `Public` |
| `POST` | `/api/auth/reset-password/:token` | Reset user password | `Public` |
| `GET` | `/api/auth/me` | Get current logged in user | `Private` |

---

### 👥 User APIs

| Method | Endpoint | Description | Access |
| :---: | --- | --- | :---: |
| `GET` | `/api/users` | Get all users | `Admin` |
| `GET` | `/api/users/:id` | Get user details | `Self/Admin` |
| `PUT` | `/api/users/:id` | Update user profile | `Self/Admin` |
| `DELETE` | `/api/users/:id` | Delete user | `Admin` |
| `POST` | `/api/users/:id/avatar` | Upload avatar | `Self` |

---

### 📚 Course APIs

| Method | Endpoint | Description | Access |
| :---: | --- | --- | :---: |
| `GET` | `/api/courses` | Get all courses | `Public` |
| `GET` | `/api/courses/:id` | Get course details | `Public` |
| `POST` | `/api/courses` | Create new course | `Instructor/Admin` |
| `PUT` | `/api/courses/:id` | Update course | `Owner/Admin` |
| `DELETE` | `/api/courses/:id` | Delete course | `Owner/Admin` |
| `GET` | `/api/courses/:id/lectures` | Get course lectures | `Enrolled Users` |

---

### 📝 Section & Lecture APIs

| Method | Endpoint | Description | Access |
| :---: | --- | --- | :---: |
| `POST` | `/api/sections` | Create section | `Instructor` |
| `PUT` | `/api/sections/:id` | Update section | `Instructor` |
| `DELETE` | `/api/sections/:id` | Delete section | `Instructor` |
| `POST` | `/api/lectures` | Add lecture | `Instructor` |
| `PUT` | `/api/lectures/:id` | Update lecture | `Instructor` |
| `DELETE` | `/api/lectures/:id` | Delete lecture | `Instructor` |

---

### 💳 Enrollment & Payment APIs

| Method | Endpoint | Description | Access |
| :---: | --- | --- | :---: |
| `POST` | `/api/enrollments` | Enroll in free course | `Student` |
| `POST` | `/api/enrollments/pay` | Pay & enroll in course | `Student` |
| `GET` | `/api/enrollments/my-courses` | Get enrolled courses | `Student` |
| `GET` | `/api/enrollments/course/:courseId/students` | Get enrolled students | `Instructor` |
| `PUT` | `/api/enrollments/:id/progress` | Update learning progress | `Student` |
| `POST` | `/api/payments/create-intent` | Create Stripe payment intent | `Student` |
| `POST` | `/api/webhooks/stripe` | Stripe webhook handler | `Public` |

---

### 📋 Assignment APIs

| Method | Endpoint | Description | Access |
| :---: | --- | --- | :---: |
| `POST` | `/api/assignments` | Create assignment | `Instructor` |
| `PUT` | `/api/assignments/:id` | Update assignment | `Instructor` |
| `DELETE` | `/api/assignments/:id` | Delete assignment | `Instructor` |
| `POST` | `/api/submissions` | Submit assignment | `Student` |
| `PUT` | `/api/submissions/:id/grade` | Grade submission | `Instructor` |
| `GET` | `/api/assignments/:id/submissions` | Get submissions | `Instructor` |

---

### ⭐ Review APIs

| Method | Endpoint | Description | Access |
| :---: | --- | --- | :---: |
| `POST` | `/api/reviews` | Create course review | `Enrolled Student` |
| `PUT` | `/api/reviews/:id` | Update review | `Owner` |
| `DELETE` | `/api/reviews/:id` | Delete review | `Owner/Admin` |
| `GET` | `/api/courses/:courseId/reviews` | Get course reviews | `Public` |



## 🔐 Authentication & Authorization

### JWT Authentication Flow

1. **User Registration / Login**
   - User submits credentials (email & password)
   - Server validates user data
   - Passwords are hashed using `bcrypt`

2. **JWT Token Generation**
   ```js
   jwt.sign(
     { id, email, role },
     JWT_SECRET,
     { expiresIn: '7d' }
   )

## 🔗 Database Associations

### Key Associations

```javascript
// Course ↔ Instructor Relationship
Course.belongsTo(User, {
  as: 'instructor',
  foreignKey: 'instructorId'
});

User.hasMany(Course, {
  as: 'taughtCourses',
  foreignKey: 'instructorId'
});

// Student ↔ Course (Many-to-Many)
User.belongsToMany(Course, {
  through: Enrollment
});

Course.belongsToMany(User, {
  through: Enrollment
});
```

---

# 💳 Stripe Payment Integration

This LMS platform supports secure online payments using Stripe.

## 🔄 Payment Flow

### 1️⃣ Create Payment Intent
Client requests payment intent from backend:

```http
POST /api/payments/create-intent
```

Backend returns:

```json
{
  "clientSecret": "pi_xxxxxxxxx_secret_xxxxx"
}
```

---

### 2️⃣ Client Confirms Payment
Frontend uses:

- Stripe Elements
- Stripe Checkout

to securely complete the payment process.

---

### 3️⃣ Stripe Webhook Events
Webhook automatically handles Stripe events:

- `payment_intent.succeeded`
- `payment_intent.payment_failed`

---

### 4️⃣ After Successful Payment

Backend automatically:

- Creates enrollment record
- Grants course access
- Sends confirmation email
- Updates payment status
- Optionally generates certificate

---

## 🔐 Stripe Webhook Endpoint

```http
POST /api/webhooks/stripe
```

Uses raw body verification middleware for security.

---

## 🔑 Stripe Environment Variables

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

# 🚀 Installation Guide

## 📋 Prerequisites

Before running this project, ensure you have:

- Node.js (v20+)
- MySQL (v8+)
- Stripe Account
- Cloudinary Account
- SMTP Email Credentials

---

# ⚙️ Environment Variables

Create a `.env` file in the project root directory:

```env
# =========================================
# SERVER CONFIGURATION
# =========================================
PORT=5000
NODE_ENV=production

# =========================================
# DATABASE CONFIGURATION
# =========================================
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=lms_db
DB_PORT=3306

# =========================================
# JWT AUTHENTICATION
# =========================================
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRES_IN=7d

# =========================================
# CLOUDINARY CONFIGURATION
# =========================================
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# =========================================
# STRIPE CONFIGURATION
# =========================================
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...


# =========================================
# EMAIL CONFIGURATION
# =========================================
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password


# =========================================
# CLIENT URL
# =========================================
CLIENT_URL=http://localhost:3000

# =========================================
# RATE LIMITING
# =========================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

# 🛠️ Installation Steps

## 1️⃣ Clone Repository

```bash
git clone https://github.com/Alishba234/lms-core-backend.git
```

---

## 2️⃣ Navigate to Project

```bash
cd lms-backend
```

---

## 3️⃣ Install Dependencies

```bash
npm install
```

---

## 4️⃣ Setup Database

Create MySQL database:

```sql
CREATE DATABASE lms_db;
```

---

## 5️⃣ Run Database Migrations

```bash
npm run migrate
```

---

## 6️⃣ Start Development Server

```bash
npm run dev
```

Server will run at:

```bash
http://localhost:5000
```

---

# 📦 Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | Backend Runtime |
| Express.js | REST API Framework |
| MySQL | Relational Database |
| Sequelize ORM | Database ORM |
| JWT | Authentication |
| Stripe | Payment Processing |
| Cloudinary | Media Storage |
| Nodemailer | Email Services |
| Multer | File Uploads |
| bcrypt.js | Password Hashing |

---

# 🔒 Security Features

- JWT Authentication
- Role-Based Authorization
- Password Hashing with bcrypt
- HTTP-Only Cookies
- Rate Limiting
- Secure Stripe Webhooks
- Environment Variable Protection
- Input Validation & Sanitization

---

# 📈 Future Improvements

- Live classes with WebRTC
- Course certificates PDF generation
- AI-powered recommendations
- Multi-language support
- Real-time notifications
- Advanced analytics dashboard

---

# 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push code
5. Open Pull Request

---

# 📄 License

This project is licensed under the MIT License.

---

# ⭐ Support

If you found this project helpful, please consider giving it a ⭐ on GitHub.

It helps support development and motivates future improvements 🚀

Webhook handles events → payment_intent.succeeded, payment_intent.payment_failed

On success: Create Enrollment record, send email, optionally generate certificate

Refunds: Admin can trigger refund via Stripe Dashboard or API

Webhook endpoint: POST /api/webhooks/stripe (raw body verification using stripe-webhook-middleware)
// .env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

🚀 Installation Guide
Prerequisites
Node.js (v20+)

MySQL (v8+)

Stripe account (for payments)

Cloudinary account (for file storage)

SMTP credentials (Gmail, SendGrid, etc.)

🔧 Environment Variables
Create a .env file in the root directory:
# Server
PORT=5000
NODE_ENV=production

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=lms_db
DB_PORT=3306

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRES_IN=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CURRENCY=usd

# Email (Gmail example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_SECURE=false

# Frontend URL (for emails & redirects)
CLIENT_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

⭐ If you like this project, don’t forget to star the repo!

