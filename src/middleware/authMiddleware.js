const jwt = require("jsonwebtoken");
const asyncHandler = require("../middleware/asyncHandler"); // optional helper
const db = require("../models"); // assuming your Sequelize models

// Protect routes
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Expect token in Authorization header: "Bearer <token>"
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user info to req.user (you can fetch full user from DB if needed)
      const user = await db.User.findByPk(decoded.id);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      req.user = {
        id: user.id,
        role: user.role,
        email: user.email,
      };

      next();
    } catch (error) {
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
});

// Optional: Middleware to allow only admins
// const admin = (req, res, next) => {
//   if (req.user && req.user.role === "admin") {
//     next();
//   } else {
//     res.status(403).json({ message: "Forbidden, admin only" });
//   }
// };
const adminOrInstructor = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const role = req.user.role;

  if (role === "admin" || role === "instructor") {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Forbidden, admin or instructor only",
  });
};
const admin = (req, res, next) => {
  // Check user exists
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized, no user found"
    });
  }

  // Check role
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Forbidden, admin only"
    });
  }

  // If admin → allow access
  next();
};
module.exports = { protect, adminOrInstructor,admin };