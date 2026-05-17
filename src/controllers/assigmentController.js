const ApiError =require ('../utils/apiError.js');
const ApiResponse= require ('../utils/apiResponse.js');
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


const validateCourseOwnership = async (courseId, user) => {
  const course = await db.Course.findByPk(courseId);
  
  if (!course) {
    throw new Error("Course not found");
  }
  
  if (user.role !== "admin" && course.instructorId !== user.id) {
    throw new Error("You are not authorized to manage assignments for this course");
  }
  
  return course;
};


const validateLectureBelongsToCourse = async (lectureId, courseId) => {
  const lecture = await  db.Lecture.findByPk(lectureId, {
    include: [{ model: db.Section, as: "section" }]
  });
  
  if (!lecture) {
    throw new Error("Lecture not found");
  }
  
  if (lecture.section.courseId !== courseId) {
    throw new Error("Lecture does not belong to the specified course");
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

/**
 * Check if user is enrolled in course
 * @param {number} userId - User ID
 * @param {number} courseId - Course ID
 * @returns {Promise<boolean>} - True if enrolled
 */
const isUserEnrolled = async (userId, courseId) => {
  const enrollment = await db.Enrollment.findOne({
    where: {
      userId,
      courseId,
      status: { [Op.in]: ["active", "completed"] }
    }
  });
  
  return !!enrollment;
};
const createAssigment=asyncHandler(async (req,res) => {
    try {
        
    } catch (error) {
        
    }
    
})
module.exports={
    createAssigment
}