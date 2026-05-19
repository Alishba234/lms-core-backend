
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
        
         const {
      title,
      description,
      instructions,
      dueDate,
      maxScore,
      passingScore,
      allowedAttempts,
      isRequired,
      courseId,
      lectureId
    } = req.body;

    // Validate required fields
    if (!title || title.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Assignment title is required"
      });
    }

    if (!description || description.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Assignment description is required"
      });
    }

    if (!dueDate) {
      return res.status(400).json({
        success: false,
        message: "Due date is required"
      });
    }

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course ID is required"
      });
    }

    // Validate course ownership
    let course;
    try {
      course = await validateCourseOwnership(courseId, req.user);
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    // Validate lecture if provided
    if (lectureId) {
      try {
        await validateLectureBelongsToCourse(lectureId, courseId);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
    }

    // Validate passing score vs max score
    const finalMaxScore = maxScore ? parseFloat(maxScore) : 100;
    const finalPassingScore = passingScore ? parseFloat(passingScore) : null;
    
    if (finalPassingScore && finalPassingScore > finalMaxScore) {
      return res.status(400).json({
        success: false,
        message: "Passing score cannot be greater than maximum score"
      });
    }

    // Upload attachment if provided
    let attachmentUrl = null;
    if (req.file) {
      const uploadResult = await uploadImage(req.file.path, "lms/assignments");
      attachmentUrl = uploadResult.secure_url;
    }

    // Create assignment
    const assignment = await db.Assignment.create({
      title: title.trim(),
      description: description.trim(),
      instructions: instructions ? instructions.trim() : null,
      dueDate: new Date(dueDate),
      maxScore: finalMaxScore,
      passingScore: finalPassingScore,
      allowedAttempts: allowedAttempts ? parseInt(allowedAttempts) : 1,
      isRequired: isRequired === true || isRequired === "true",
      isPublished: false,
      attachmentUrl,
      courseId,
      lectureId: lectureId || null
    });

    // Fetch created assignment with relations
    const createdAssignment = await  db.Assignment.findByPk(assignment.id, {
      include: [
        { model: Course, as: "course", attributes: ["id", "title", "instructorId"] },
        { model: Lecture, as: "lecture", attributes: ["id", "title"] }
      ]
    });
    } catch (error) {
         return res.status(500).json({
      success: false,
      message: error.message
    });
    }
    
})
const getAllAssigments=asyncHandler(async (req,res) => {
  try {
      const {
      page,
      limit,
      courseId,
      lectureId,
      isPublished,
      dueDateBefore,
      dueDateAfter
    } = req.query;
    
    const { offset, limit: parsedLimit } = getPagination(page, limit);

    // Determine user authorization
    const isAuthorized = req.user && (req.user.role === "admin");
    let isInstructor = false;
    let instructorCourses = [];
    
    if (req.user && req.user.role === "instructor") {
      isInstructor = true;
      instructorCourses = await db.Course.findAll({
        where: { instructorId: req.user.id },
        attributes: ["id"]
      });
      instructorCourses = instructorCourses.map(c => c.id);
    }

    // Build where clause
    const where = {};
    
    if (courseId) {
      where.courseId = courseId;
    }
    
    if (lectureId) {
      where.lectureId = lectureId;
    }
    
    // Publication status filtering
    if (isPublished !== undefined && isPublished !== "") {
      where.isPublished = isPublished === "true" || isPublished === true;
    } else if (!isAuthorized && !isInstructor) {
      // Public users see only published assignments
      where.isPublished = true;
    }
    
    // Due date filtering
    if (dueDateBefore) {
      where.dueDate = { [Op.lte]: new Date(dueDateBefore) };
    }
    
    if (dueDateAfter) {
      where.dueDate = { ...where.dueDate, [Op.gte]: new Date(dueDateAfter) };
    }
    
    // For instructors, show assignments only from their courses
    if (isInstructor && !isAuthorized) {
      where.courseId = { [Op.in]: instructorCourses };
    }

    const { count, rows: assignments } = await db.Assignment.findAndCountAll({
      where,
      include: [
        { model: Course, as: "course", attributes: ["id", "title", "instructorId"] },
        { model: Lecture, as: "lecture", attributes: ["id", "title"] }
      ],
      order: [["dueDate", "ASC"]],
      offset,
      limit: parsedLimit,
      distinct: true
    });

    const totalPages = Math.ceil(count / parsedLimit);
    const currentPage = parseInt(page, 10) || 1;

    return res.status(200).json({
      success: true,
      message: "Assignments retrieved successfully",
      data: {
        assignments,
        pagination: {
          totalItems: count,
          totalPages,
          currentPage,
          itemsPerPage: parsedLimit,
          hasNextPage: currentPage < totalPages,
          hasPrevPage: currentPage > 1
        }
      }
    });
  } catch (error) {
         return res.status(500).json({
      success: false,
      message: error.message
    });   
  }
  
})
const getAssigmentsById=asyncHandler(async (req,res) => {
  try {
      const { id } = req.params;

    const assignment = await db.Assignment.findByPk(id, {
      include: [
        { model: Course, as: "course", attributes: ["id", "title", "instructorId"] },
        { model: Lecture, as: "lecture", attributes: ["id", "title", "sectionId"] }
      ]
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found"
      });
    }

    // Check authorization for unpublished assignments
    if (!assignment.isPublished) {
      const isAuthorized = req.user && 
        (req.user.role === "admin" || assignment.course.instructorId === req.user.id);
      
      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: "This assignment is not published yet"
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Assignment retrieved successfully",
      data: assignment
    });
  } catch (error) {
       return res.status(500).json({
      success: false,
      message: error.message
    });    
  }
  
})
const deleteAssigment=asyncHandler(async (req,res) => {
  try {
     const { id } = req.params;

    // Find assignment with relations
    const assignment = await db.Assignment.findByPk(id, {
      include: [{ model: Course, as: "course" }]
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found"
      });
    }

    // Validate course ownership
    try {
      await validateCourseOwnership(assignment.courseId, req.user);
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    // Delete attachment from Cloudinary
    if (assignment.attachmentUrl) {
      await deleteOldAttachment(assignment.attachmentUrl);
    }

    // Delete assignment
    await assignment.destroy();

    return res.status(200).json({
      success: true,
      message: "Assignment deleted successfully"
    });
  } catch (error) {
     return res.status(500).json({
      success: false,
      message: error.message
    });    
  }
  
})
const pulishAssigment=asyncHandler(async (req,res) => {
  try {
     const { id } = req.params;

    const assignment = await db.Assignment.findByPk(id, {
      include: [{ model: Course, as: "course" }]
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found"
      });
    }

    // Validate course ownership
    try {
      await validateCourseOwnership(assignment.courseId, req.user);
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    assignment.isPublished = true;
    await assignment.save();

    return res.status(200).json({
      success: true,
      message: "Assignment published successfully",
      data: {
        id: assignment.id,
        title: assignment.title,
        isPublished: assignment.isPublished
      }
    });
  } catch (error) {
   return res.status(500).json({
      success: false,
      message: error.message
    });    
  }
  
})
const unpulishAssigment=asyncHandler(async (req,res) => {
  try {
      const { id } = req.params;

    const assignment = await db.Assignment.findByPk(id, {
      include: [{ model: Course, as: "course" }]
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found"
      });
    }

    // Validate course ownership
    try {
      await validateCourseOwnership(assignment.courseId, req.user);
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    assignment.isPublished = false;
    await assignment.save();

    return res.status(200).json({
      success: true,
      message: "Assignment unpublished successfully",
      data: {
        id: assignment.id,
        title: assignment.title,
        isPublished: assignment.isPublished
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });    
  }
  
})
module.exports={
    createAssigment,
    getAllAssigments,
    getAssigmentsById,
    deleteAssigment,
    pulishAssigment,
    unpulishAssigment
}