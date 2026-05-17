const ApiError =require ('../utils/apiError.js');
const ApiResponse= require ('../utils/apiResponse.js');
const asyncHandler =  require ('../middleware/asyncHandler.js');
const db=require('../models');
const { Op } = require("sequelize");
const slugify = require("slugify");
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
const generateCertificate = async (userId, courseId, userName, courseTitle) => {
  // Simulate certificate generation
  // In production, this would integrate with a certificate generation service
  const certificateId = `CERT-${courseId}-${userId}-${Date.now()}`;
  const certificateUrl = `https://lms.example.com/certificates/${certificateId}`;
  
  // You can implement actual PDF generation here using libraries like pdfkit
  // For now, we'll return a mock URL
  
  return certificateUrl;
};
const checkAlreadyEnrolled = async (courseId, userId) => {
  const existingEnrollment = await db.Enrollment.findOne({
    where: { courseId, userId }
  });

  return !!existingEnrollment;
};
const calculateProgressCompletion = (progress) => {
  const isCompleted = progress >= 100;
  const status = isCompleted ? "completed" : "active";

  return { isCompleted, status };
};
const updateCourseEnrollementCount = async (courseId) => {
  const totalStudents = await db.Enrollment.count({
    where: {
      courseId,
      status: { [Op.in]: ["active", "completed"] }
    }
  });

  const course = await db.Course.findByPk(courseId);

  if (course) {
    course.totalStudents = totalStudents;
    await course.save();
  }

  return { totalStudents };
};
const validateCourseEnrollment = async (course, paymentId) => {
  if (!course) throw new ApiError(400, "Course not found");

  if (!course.isPublished)
    throw new ApiError(400, "Course is not published yet");

  // ✅ Only validate payment if course is paid
  if (course.price > 0 && !course.isFree) {
    if (!paymentId)
      throw new ApiError(400, "Payment ID is required");

    const payment = await db.Payment.findByPk(paymentId);

    if (!payment)
      throw new ApiError(400, "Invalid payment ID");

    if (payment.status !== "completed")
      throw new ApiError(400, "Payment is not completed");
  }

  return { valid: true };
};
const enrollCourse = asyncHandler(async (req, res) => {
  try {
    const { paymentId, courseId } = req.body;
    const userId = req.user.id;

    if (!courseId)
      throw new ApiError(400, "Course ID is required");

    const course = await db.Course.findByPk(courseId);
    console.log("course from DB:", course);

    if (!course)
      throw new ApiError(404, "Course not found");

    const alreadyEnrolled = await checkAlreadyEnrolled(courseId, userId);

    if (alreadyEnrolled)
      throw new ApiError(400, "You are already enrolled");

    await validateCourseEnrollment(course, paymentId);

    const enrollment = await db.Enrollment.create({
      courseId,
      paymentId: paymentId || null,
      userId,
      status: "active",
      progress: 0,
      enrolledAt: new Date(),
      completedAt: null, // ✅ FIX
      lastAccessedAt: new Date(),
      certificateIssued: false
    });

    await updateCourseEnrollementCount(courseId);

    // ✅ FIXED findByPk
    const createdEnrollment = await db.Enrollment.findByPk(enrollment.id, {
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["id", "firstName", "avatar"],
           include: [
                      {
                        model: db.Course,
                        as: "course" // ✅ same as your requirement
                      }
                    ]
        },
       
      ]
    });

    return res.status(201).json(
      new ApiResponse(201, {
        message: course.isFree
          ? "Enrolled successfully"
          : "Enrolled after payment verification",
        data: createdEnrollment
      })
    );

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
const getMyEnrollments=asyncHandler(async (req,res) => {
    try {
        const {page,limit,status}=req.query;
        const {offset,limit:parsedLimit}=getPagination(page,limit)
        const userId=req.user.id;
        const where={userId};
        if(status && ['active','compelted','dropped','suspended'].includes(status)){
            where.status=status
        }
        const {count,rows:enrollments}=await db.Enrollment.findAndCountAll({
            include:[
                {
                    model:db.Course,
                    as:"course",
                    attributes:['id','title','slug','instructorId','level','thumbnail'],
                    include:[
                        {
                            model:db.User,
                            as:"user",
                            attributes:['id','name']
                        }
                    ]

                }
            ],
            order:[["enrolledAt","DESC"]],
            offset,
            limit:parsedLimit,
            distinct: true
        })
        const totalPages=Math.ceil(count/parsedLimit);
        const currentPage=parseInt(page,10)||1;
        const activeCourses=enrollments.filter(e=>e.status==="active").length;
        const completedCourses=enrollments.filter(e=>e.status==="completed").length;
        const avrageProgress=enrollments.length>0?Math.round(enrollments.reduce((sum,e)=>sum+e.progress/enrollments.length)):0
         return res.status(201).json(
      new ApiResponse(201, {
        message: "Enrollments retrieved successfull",
        data: {
            enrollments,
            stats:{
                totalEnrollments:count,
                activeCourses,
                completedCourses,
                avrageProgress
            },
            pagination:{
                totalItems:count,
                totalPages,
                currentPage,
                  itemsPerPage: parsedLimit,
                    hasNextPage: currentPage < totalPages,
                    hasPrevPage: currentPage > 1

            }
        }
      })
    );  

    } catch (error) {
        return res.status(500).json({
      success: false,
      message: error.message
    }); 
    }
    
})
const getEnrollmentsById=asyncHandler(async (req,res) => {
    try {
        const {id}=req.params;
        const userId=req.user.id;
        const isAdmin=req.user.role==="admin";
        const enrollment=await db.Enrollment.findByPk(id,{
            include:[
                {
                    model:db.User,
                    as:"user",
                    attributes:['id','firstName','avatar','email'],
                    include:[
                        {
                            model:db.Course,
                            as:"course",
                            attributes:['id','title','level','intructorId','thumbnail','description']
                        }
                    ]
                }
            ]
        })
        if(!enrollment)
            throw new ApiError(400,"Enrollment not found")
        if(!isAdmin && enrollment.userId!==userId)
    throw new ApiError(400, "You are not authorized to view this enrollment")
 return res.status(201).json(
      new ApiResponse(201, {
        message: "Enrollment retrieved successfully",
        data: enrollment
      })
    );
    } catch (error) {
         return res.status(500).json({
      success: false,
      message: error.message
    });        
    }
    
})
const updateProgress=asyncHandler(async (req,res) => {
  try {
    const {id}=req.params;
    const {progress}=req.body;
    const userId=req.user.id;
    const newProgress=parseInt(progress,10);
    if(isNaN(newProgress)||newProgress<0||newProgress>100)
      throw new ApiError(400,"Progress must be a number between 0 and 100")
    const enrollment=await db.Enrollment.findByPk(isFinite,{
      include:[
        {
          model:db.User,
          as:"user"
        },
        {
          model:db.Course,
          as:"course"
        }
      ]
    });
    if(!enrollment)
       throw new ApiError(400,"Enrollment not found")
      if(enrollment.userId!==userId)
          throw new ApiError(400, "You are not authorized to update progress for this enrollment")
        enrollment.progress=newProgress,
        enrollment.lastAccessedAt=new Date()
        const {status,isCompleted}=calculateProgressCompletion(newProgress)
        if(isCompleted&&enrollment.status!=="completed"){
          enrollment.status=status,
          enrollment.completedAt=new Date()
          if(!enrollment.certificateIssued){
            const certificateUrl=generateCertificate(
              enrollment.userId,
              enrollment.courseId,
              enrollment.user.name,
              enrollment.course.title
            );
            enrollment.certificateUrl=certificateUrl,
            enrollment.certificateIssued=true
          }
        }else if(!isCompleted&&enrollment.status!=="completed"){
          enrollment.stats='active',
          enrollment.completedAt=null
        }else{
          enrollment.stats=status
        }
        await enrollment.save()
          return res.status(201).json(
      new ApiResponse(201, {
        message: isCompleted
          ? "Course completed! Certificate generated."
          :  "Progress updated successfully",
        data: {
          id:enrollment.id,
          progress:enrollment.progress,
          certificateIssued:enrollment.certificateIssued,
          certificateUrl:enrollment.certificateUrl,
          completedAt:enrollment.completedAt,
          status:enrollment.stats

        }
      })
    );
  } catch (error) {
         return res.status(500).json({
      success: false,
      message: error.message
    });    
  }
  
})
const markeAsCompleted=asyncHandler(async (req,res) => {
  try {
    const {id}=req.params;
    const userId=req.user.id
    const isAdmin=req.user.role==="admin";
    const enrollment=await db.Enrollment.findByPk(id,{
      include:[
        {
          model:db.User,
          as:"user"
        },
        {
          model:db.Course,
          as:"course"
        }
      ]
    });
    if(!enrollment)
        throw new ApiError(400,"Enrollment not found")
      if(!isAdmin&&enrollment.userId!==userId)
        throw new ApiError(400,"You are not authorized to mark this course as completed")
      if(enrollment.stats==="completed")
        throw new ApiError(400,"Course is already marked as completed")
      enrollment.progress=100,
      enrollment.status="completed",
      enrollment.completedAt=new Date()
      enrollment.lastAccessedAt=new Date()
      if(!enrollment.certificateIssued){
        const certificateUrl=await generateCertificate(
          enrollment.courseId,
          enrollment.userId,
          enrollment.user.name,
          enrollment.course.title
        );
        enrollment.certificateUrl=certificateUrl,
        enrollment.certificateIssued=true
     
      }
         await enrollment.save()
          return res.status(201).json(
      new ApiResponse(201, {
        message: "Course marked as completed successfully",
        data: {
          id:enrollment.id,
          status:enrollment.status,
          progress:enrollment.progress,
          completedAt:enrollment.completedAt,
          certificateIssued:enrollment.certificateIssued,
          certificateUrl:enrollment.certificateUrl
        }
      })
    );
  } catch (error) {
        return res.status(500).json({
      success: false,
      message: error.message
    });     
  }
  
})
const dropCourse=asyncHandler(async (req,res) => {
  try {
    const {id}=req.params;
    const userId=req.user.id;
    const enrollment=await db.Enrollment.findByPk(id,{
      include:[
        {
          model:db.User,
          as:"user"
        },
        {
          model:db.Course,
          as:"course"
        }
      ]
    });
    if(!enrollment)
        throw new ApiError(400,"Enrollment not found")
      if(enrollment.userId!==userId)
        throw new ApiError(403, "You are not authorized to drop this course")
      if(enrollment.status==="dropped")
        throw new ApiError(400,"Course is already dropped")
      enrollment.status="dropped"
      await enrollment.save()
      await updateCourseEnrollementCount(enrollment.courseId)
       return res.status(201).json(
      new ApiResponse(201, {
        message:  "Course dropped successfully",
        data: {
          id:enrollment.id,
          status:enrollment.status,
          courseId:enrollment.courseId
        }
      })
    );
  } catch (error) {
        return res.status(500).json({
      success: false,
      message: error.message
    });    
  }
  
})
const deleteEnrollment=asyncHandler(async (req,res) => {
  try {
    const {id}=req.params;
    const enrollment=await db.Enrollment.findByPk(id)
    if(!enrollment)
      throw new ApiError(400,"Enrollment not found")
    await enrollment.destroy()
    await updateCourseEnrollementCount(enrollment.courseId)
          return res.status(201).json(
      new ApiResponse(201, {
        message:"Enrollment deleted successfully",
      })
    );      

  } catch (error) {
        return res.status(500).json({
      success: false,
      message: error.message
    });   
  }
  
})
const resumeEnrollment=asyncHandler(async (req,res) => {
  try {
    const {id}=req.params;
    const enrollment=await db.Enrollment.findByPk(id);
    if(!enrollment)
      throw new ApiError(400,"Enrollment not found")
    if(enrollment.status!=="suspend")
      throw new ApiError(403,"Enrollment is not suspended. Only suspended enrollments can be resumed.")
    enrollment.status="active"
    await enrollment.save()
       await updateCourseEnrollementCount(enrollment.courseId)
          return res.status(201).json(
      new ApiResponse(201, {
        message: "Enrollment resumed successfully",
        data:{
          id:enrollment.id,
          status:enrollment.status,
          courseId:enrollment.courseId,
          userId:enrollment.userId
        }
      })
    ); 
  } catch (error) {
      return res.status(500).json({
      success: false,
      message: error.message
    });
  }
  
})
const suspendeEnrollment=asyncHandler(async (req,res) => {
  try {
    const {id}=req.params;
    const enrollment=await db.Enrollment.findByPk(id);
    if(!enrollment)
      throw new ApiError(400,"Enrollment not found")
    if(enrollment.status==="suspended")
      throw new ApiError(403,"Enrollment is already suspended")
    enrollment.status="suspended"
    await enrollment.save()
    await updateCourseEnrollementCount(enrollment.courseId)
       return res.status(201).json(
      new ApiResponse(201, {
        message: "Enrollment suspended successfully",
        data:{
          id:enrollment.id,
          status:enrollment.status,
          courseId:enrollment.courseId,
          userId:enrollment.userId
        }
      })
    ); 
  } catch (error) {
      return res.status(500).json({
      success: false,
      message: error.message
    });
  }
  
})
const getAllEnrollments=asyncHandler(async (req,res) => {
  try {
    const {userId,courseId,status,page,limit}=req.query;
    const {offset,limit:parsedLimit}=getPagination(page,limit)
    const where={}
    if(userId) where.userId=parseInt(userId,10)//it will be valid number
    if(courseId) where.courseId=parseInt(courseId,10);
    if(status&&['active','completed','suspended','dropped'].includes(status)){
      where.stats=status
    }
    const {count,rows:enrollments}=await db.Enrollment.findAndCountAll({
      include:[
        {
          model:db.User,
          as:"user",
          attributes:['id','firstName','role','email']
        },
        {
          model:db.Course,
          as:"course",
          attributes:['id','title','description','instructorId',]
        }
      ],
      order:[["enrolledAt","DESC"]],
      offset,
      limit:parsedLimit,
      distinct:true
    })
    const totalActive=enrollments.filter(e=>e,status==="active").length
     const totalCompleted=enrollments.filter(e=>e,status==="completed").length
      const totalDropped=enrollments.filter(e=>e,status==="dropped").length
       const totalSuspended=enrollments.filter(e=>e,status==="suspended").length
       const totalPages=Math.ceil(count/parsedLimit)
       const currentPage=parseInt(page,10)||1;
              return res.status(201).json(
      new ApiResponse(201, {
        message: "Enrollment suspended successfully",
        data:{
          enrollments,
          totalEnrollments:count,
          totalActive:totalActive,
          totalCompleted:totalCompleted,
          totalDropped:totalDropped,
          totalSuspended:totalSuspended,
        },
        pagination:{
            totalItems: count,
          totalPages,
          currentPage,
          itemsPerPage: parsedLimit,
          hasNextPage: currentPage < totalPages,
          hasPrevPage: currentPage > 1
        }
      })
    ); 
  } catch (error) {
     return res.status(500).json({
      success: false,
      message: error.message
    });
  }
  
})
const getCourseEnrollments=asyncHandler(async (req,res) => {
  try {
    const {courseId}=req.params;
    const {limit,page,status,minProgress,maxProgress}=req.query;
    const {offset,limit:parsedLimit}=getPagination(page,limit)
    const userId=req.user.id;
    const isAdmin=req.user.rol==="admin"
    const course=await db.Course.findByPk(courseId)
if(!course)
  throw new ApiError(400,"Course not found")
if(!isAdmin&&course.instructorId!==userId)
  throw new ApiError(403,"You are not authorized to view enrollments for this course")
const where={courseId}
if(status&&['active','completed','suspended','dropped'].includes(status)){
  where.stats=status
}
if(minProgress!==undefined||maxProgress!==undefined){
  where.progress={}
  if(minProgress!==undefined) where.progress[Op.gte]=parseInt(minProgress,10);
  if(maxProgress!==undefined) where.progress[Op.lte]=parseInt(maxProgress,10)
    const {count,rows:enrollments}=await db.Enrollment.findAndCountAll({
  include:[
    {
      model:db.User,
      as:"user",
      attributes:['id','email','avatar']
    },
  ],
  order:[["enrolledAt",'DESC']],
  offset,
  limit:parsedLimit,
  distinct:true
  })
}
const totalActive=enrollments.filter(e=>e.stats==="active").filter
const totalCompleted=enrollments.filter(e=>e.stats==="completed").filter
const avrageProgress=enrollments.length>0?Math.round(enrollments.reduce((sum,e)=>sum+e.progress,0)/enrollments.length):0

const totalPages=Math.ceil(count/parsedLimit)
const currentPage=parseInt(page,10)||1;
  return res.status(201).json(
      new ApiResponse(201, {
        message: "Course enrollments retrieved successfully",
        data:{
          enrollments,
          totalEnrollments:count,
          totalActive:totalActive,
          totalCompleted:totalCompleted,
          avrageProgress
       
        },
        pagination:{
          totalItems: count,
          totalPages,
          currentPage,
          itemsPerPage: parsedLimit,
          hasNextPage: currentPage < totalPages,
          hasPrevPage: currentPage > 1
        }
      })
    ); 

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
  
})
module.exports={
    enrollCourse,
    getMyEnrollments,
    getEnrollmentsById,
    markeAsCompleted,
    dropCourse,
    deleteEnrollment,
    resumeEnrollment,
    suspendeEnrollment,
    getAllEnrollments,
    getCourseEnrollments

}