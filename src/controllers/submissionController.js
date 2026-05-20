
const asyncHandler =  require ('../middleware/asyncHandler.js');
const db=require('../models');
const { where } = require('sequelize');
const {deleteImage,deleteVideo}=require('../config/cloudinary.js');

const getPagination = (page = 1, limit = 10) => {
  const parsedPage = parseInt(page, 10);
  const parsedLimit = parseInt(limit, 10);
  
  const validPage = parsedPage > 0 ? parsedPage : 1;
  const validLimit = parsedLimit > 0 && parsedLimit <= 100 ? parsedLimit : 10;
  
  const offset = (validPage - 1) * validLimit;
  
  return { offset, limit: validLimit };
};


const validateEnrollment = async (userId, courseId) => {
  const enrollment = await Enrollment.findOne({
    where: {
      userId,
      courseId,
      status: { [Op.in]: ["active", "completed"] }
    }
  });
  
  if (!enrollment) {
    throw new Error("You are not enrolled in this course");
  }
  
  return true;
};


const validateAssignmentOwnership = async (assignmentId, user) => {
  const assignment = await Assignment.findByPk(assignmentId, {
    include: [{ 
      model: Course, 
      as: "course",
      attributes: ["id", "instructorId"]
    }]
  });
  
  if (!assignment) {
    throw new Error("Assignment not found");
  }
  
  if (user.role !== "admin" && assignment.course.instructorId !== user.id) {
    throw new Error("You are not authorized to access this assignment's submissions");
  }
  
  return assignment;
};


const calculateAttemptNumber = async (userId, assignmentId) => {
  const maxAttempt = await Submission.max("attemptNumber", {
    where: { userId, assignmentId }
  });
  
  return maxAttempt ? maxAttempt + 1 : 1;
};


const checkLateSubmission = (dueDate) => {
  const now = new Date();
  const isLate = now > new Date(dueDate);
  
  return {
    isLate,
    status: isLate ? "late" : "submitted"
  };
};


const validateAllowedAttempts = async (userId, assignment) => {
  const completedSubmissions = await Submission.count({
    where: {
      userId,
      assignmentId: assignment.id,
      status: { [Op.ne]: "draft" }
    }
  });
  
  if (completedSubmissions >= assignment.allowedAttempts) {
    throw new Error(`Maximum attempts (${assignment.allowedAttempts}) reached for this assignment`);
  }
  
  return true;
};


const deleteOldAttachment = async (attachmentUrl) => {
  if (!attachmentUrl) return;
  
  try {
    // Extract public_id from Cloudinary URL
    const parts = attachmentUrl.split("/");
    const filename = parts[parts.length - 1];
    const publicId = filename.split(".")[0];
    const folder = parts[parts.length - 2];
    const fullPublicId = `${folder}/${publicId}`;
    
    await deleteImage(fullPublicId);
  } catch (error) {
    console.error("Error deleting old attachment:", error);
  }
};
const createSubmission=asyncHandler(async (req,res) => {
    try {
         const { assignmentId, content } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!assignmentId) {
      return res.status(400).json({
        success: false,
        message: "Assignment ID is required"
      });
    }

    // Find assignment with course
    const assignment = await Assignment.findByPk(assignmentId, {
      include: [{ model: Course, as: "course" }]
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found"
      });
    }

    // Check if assignment is published
    if (!assignment.isPublished) {
      return res.status(400).json({
        success: false,
        message: "This assignment is not available for submission"
      });
    }

    // Validate enrollment
    try {
      await validateEnrollment(userId, assignment.courseId);
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    // Validate allowed attempts
    try {
      await validateAllowedAttempts(userId, assignment);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    // Calculate attempt number
    const attemptNumber = await calculateAttemptNumber(userId, assignmentId);

    // Check if submission is late
    const { isLate, status } = checkLateSubmission(assignment.dueDate);

    // Upload attachment if provided
    let attachmentUrl = null;
    if (req.file) {
      const uploadResult = await uploadImage(req.file.path, "lms/submissions");
      attachmentUrl = uploadResult.secure_url;
    }

    // Create submission
    const submission = await Submission.create({
      content: content || null,
      attachmentUrl,
      status,
      attemptNumber,
      submittedAt: new Date(),
      isLate,
      userId,
      assignmentId
    });

    // Fetch created submission with relations
    const createdSubmission = await Submission.findByPk(submission.id, {
      include: [
        { model: User, as: "user", attributes: ["id", "name", "email"] },
        { model: Assignment, as: "assignment", attributes: ["id", "title", "dueDate", "maxScore"] }
      ]
    });

    return res.status(201).json({
      success: true,
      message: isLate ? "Submission submitted late" : "Assignment submitted successfully",
      data: createdSubmission
    });
    } catch (error) {
         return res.status(500).json({
      success: false,
      message: error.message
    }); 
    }
    
})
module.exports={
    createSubmission
}