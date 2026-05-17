const ApiError =require ('../utils/apiError.js');
const ApiResponse= require ('../utils/apiResponse.js');
const asyncHandler =  require ('../middleware/asyncHandler.js');
const db=require('../models');
const { Op } = require("sequelize");
const slugify = require("slugify");
const { where } = require('sequelize');
const {deleteImage,deleteVideo}=require('../config/cloudinary.js');
const { report } = require('../routes/reviewRoutes.js');

const buildAdminFilterQuery = (filters) => {
  const where = {};
  
  if (filters.isApproved !== undefined && filters.isApproved !== "") {
    where.isApproved = filters.isApproved === "true" || filters.isApproved === true;
  }
  
  if (filters.reported !== undefined && filters.reported !== "") {
    where.reported = filters.reported === "true" || filters.reported === true;
  }
  
  if (filters.rating) {
    where.rating = parseInt(filters.rating, 10);
  }
  
  if (filters.courseId) {
    where.courseId = parseInt(filters.courseId, 10);
  }
  
  return where;
};

const getPagination = (page = 1, limit = 10) => {
  const parsedPage = parseInt(page, 10);
  const parsedLimit = parseInt(limit, 10);

  const validPage = parsedPage > 0 ? parsedPage : 1;
  const validLimit = parsedLimit > 0 && parsedLimit <= 50 ? parsedLimit : 10;

  const offset = (validPage - 1) * validLimit;

  return { offset, limit: validLimit };
};
const updateCourseRating = async (courseId) => {
  const reviews = await db.Review.findAll({
    where: {
      courseId,
      isApproved: true
    },
    attributes: ["rating"]
  });

  const totalReviews = reviews.length; // FIXED

  let averageRating = 0;

  if (totalReviews > 0) {
    const sumRatings = reviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );

    averageRating = parseFloat((sumRatings / totalReviews).toFixed(2));
  }

  const course = await db.Course.findByPk(courseId);

  if (course) {
    course.totalReviews = totalReviews;
    course.averageRating = averageRating;

    await course.save();
  }

  return { averageRating, totalReviews };
};
const checkIfUserEnrolled = async (courseId, userId) => {
  const enrollment = await db.Enrollment.findOne({
    where: { courseId, userId, status: "active" }
  });

  return !!enrollment;
};
const validateRating = (rating) => {
  const parsedRating = parseInt(rating, 10);

  if (isNaN(parsedRating)) {
    throw new ApiError(400, "Rating must be a number");
  }

  // ❌ FIX: AND → OR
  if (parsedRating < 1 || parsedRating > 5) {
    throw new ApiError(400, "Rating must be between 1 and 5");
  }

  return parsedRating; // ✔ better return value
};
const checkUserAlreadyExist = async (courseId, userId) => {
  const existingReview = await db.Review.findOne({
    where: { courseId, userId }
  });

  return !!existingReview;
};

const createReview = asyncHandler(async (req, res) => {
  try {
    const { comment, rating, title, courseId } = req.body;
    const userId = req.user.id;
    const course = await db.Course.findByPk(3);
    console.log(course);

    if (!courseId) {
      throw new ApiError(400, "CourseId is required");
    }

    // ✔ FIX: correct usage
    const parsedRating = validateRating(rating);

    if (!comment || comment.trim() === "") {
      throw new ApiError(400, "Review comment is required");
    }

    const alreadyReviewed = await checkUserAlreadyExist(courseId, userId);
    if (alreadyReviewed) {
      throw new ApiError(
        400,
        "You have already reviewed this course. You can only review once"
      );
    }
  

    const isEnrolled = await checkIfUserEnrolled(courseId, userId);

    const review = await db.Review.create({
      title: title ? title.trim() : null,
      comment: comment.trim(),
      rating: parsedRating,
      courseId,
      userId,
      isApproved: false,
      helpful: 0,
      reported: false,
      isVerifiedPurchase: isEnrolled
    });
      console.log(review.courseId);

    const createdReview = await db.Review.findByPk(review.id, {
      include: [
        {
          model: db.User,
          as: "user", // ✔ FIX: instructor → user
          attributes: ["id", "firstName", "avatar"]
        },
        {
          model: db.Course,
          as: "course", // ✔ keep as your alias
          attributes: ["id", "title", "instructorId"]
        }
      ]
    });

    return res.status(201).json(
      new ApiResponse(201, {
        message: "Review submitted successfully and pending admin approval",
        data: createdReview // ✔ FIX
      })
    );

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
const getCourseReviews = asyncHandler(async (req, res) => {
  try {
    const { courseId } = req.params;
    const { page, limit, sortBy = "newest", rating } = req.query;

    const { offset, limit: parsedLimit } = getPagination(page, limit);

   
    const course = await db.Course.findByPk(courseId);
    if (!course) {
      throw new ApiError(404, "Course not found");
    }

  
    const where = {
      courseId,
      isApproved: true
    };

    const parsedRating = parseInt(rating, 10);
    if (parsedRating >= 1 && parsedRating <= 5) {
      where.rating = parsedRating;
    }


    let order = [];

    switch (sortBy) {
      case "heighest_rating":
        order = [["rating", "DESC"], ["createdAt", "DESC"]];
        break;

      case "most_helpful":
        order = [["helpful", "DESC"], ["createdAt", "DESC"]];
        break;

      case "oldest":
        order = [["createdAt", "ASC"]];
        break;

      case "newest":
      default:
        order = [["createdAt", "DESC"]];
        break;
    }

   
    const { count, rows: reviews } = await db.Review.findAndCountAll({
      where,
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["id", "firstName", "avatar"]
        }
      ],
      order,
      offset,
      limit: parsedLimit,
      distinct: true
    });

    const totalPages = Math.ceil(count / parsedLimit);
    const currentPage = parseInt(page, 10) || 1;

    return res.status(200).json(
      new ApiResponse(200, {
        message: "Reviews retrieved successfully",
        data: {
          reviews,
          courseStats: {
            totalReviews: course.totalReviews,
            averageRating: course.averageRating
          },
          pagination: {
            totalItems: count,
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
});
const getReviewById=asyncHandler(async (req,res) => {
    try {
        const {id}=req.params;
        const review=await db.Review.findByPk(id,{
            include:[
                {
                    model:db.User,
                    as:"user",
                    attributes:['id','firstName','avatar']
                },
                {
                    model:db.Course,
                    as:"course",
                    attributes:['title']
                }
            ]
        });
        if(!review)
            throw new ApiError(400,"Review not found")
        const isOwner=req.user && review.userId===req.user.id;
        const isAdmin=req.user && req.user.role==="admin";
        const isInstructor=req.user && review.course.isInstructor===req.user.id
        const isApproved=review.isApproved;
        if(!isOwner||!isAdmin||isInstructor||!isApproved)
            throw new ApiError(400,"This review is pending approval and not yet visible")
         return res.status(201).json(
      new ApiResponse(201, {
        message: "Review fetched successfully",
        data: review // ✔ FIX
      })
    );
    } catch (error) {
        return res.status(500).json({
      success: false,
      message: error.message
    });       
    }
    
})
const updateReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, rating, comment } = req.body;
  const userId = req.user.id;

  const review = await db.Review.findByPk(id);

  if (!review)
    throw new ApiError(404, "Review not found");

  if (review.userId !== userId)
    throw new ApiError(403, "Not authorized to update this review");

  if (rating) {
    const ratingValidation = validateRating(rating);

    if (!ratingValidation.valid) {
      throw new ApiError(400, ratingValidation.message);
    }

    review.rating = parseInt(rating, 10);
  }

  if (title !== undefined) {
    review.title = title ? title.trim() : null;
  }

  if (comment !== undefined && comment !== "") {
    review.comment = comment.trim();
  }

  review.isApproved = false;

  await review.save();
  await updateCourseRating(review.courseId);

  const updatedReview = await db.Review.findByPk(id, {
    include: [
      {
        model: db.User,
        as: "user",
        attributes: ["id", "firstName", "avatar"]
      },
      {
        model: db.Course,
        as: "course",
        attributes: ["id", "title"]
      }
    ]
  });

  return res.status(200).json(
    new ApiResponse(200, {
      message: "Review updated successfully",
      data: updatedReview
    })
  );
});
const deleteReview=asyncHandler(async (req,res) => {
  try {
    const {id}=req.params;
    const userId=req.user.id;
    const isAdmin=req.user.role==="admin"
    const review=await db.Review.findByPk(id);
    if(!review)
       throw new ApiError(400,"Review not found")
      if(!isAdmin&&review.userId!==userId)
        throw new ApiError(400,"You are not authorized to delete this review")
      await review.destroy()
      const courseId=review.courseId
      await updateCourseRating(courseId)
       return res.status(200).json(
    new ApiResponse(200, {
      message: "Review deleted successfully",
    })
  );
  } catch (error) {
      return res.status(500).json({
      success: false,
      message: error.message
    });  
  }
  
})
const markHelpful=asyncHandler(async (req,res) => {
  try {
    const {id}=req.params;
    const review=await db.Review.findByPk(id)
    if(!review)
      throw new ApiError(400,"Review not found")
    review.helpful=(review.helpful||0)+1;
    await review.save()
       return res.status(200).json(
    new ApiResponse(200, {
      message: "Review marked as helpful",
      data:{
        id:review.id,
        helpful:review.helpful
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
const reportReview=asyncHandler(async (req,res) => {
  try {
    const {id}=req.params;
    const review=await db.Review.findByPk(id);
    if(!review)
      throw new ApiError(400,"Review not found")
    review.reported=true,
    await review.save()
       return res.status(200).json(
    new ApiResponse(200, {
      message: "Review reported successfully. Our team will review it.",
      data:{
        id:review.id,
        reported:review.reported
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
const getAllReviews = asyncHandler(async (req, res) => {
  const { isApproved, rating, courseId, reported, page, limit } = req.query;

  const { offset, limit: parsedLimit } = getPagination(page, limit);

  const where = buildAdminFilterQuery({
    isApproved,
    courseId,
    reported,
    rating
  });

  const { count, rows: reviews } = await db.Review.findAndCountAll({
    where,
    include: [
      {
        model: db.User,
        as: "user",
        attributes: ["id", "firstName", "avatar"]
      },
      {
        model: db.Course,
        as: "course", // ⚠️ keep consistent with your model
        attributes: ["id", "title"]
      }
    ],
    order: [["createdAt", "DESC"]],
    offset,
    limit: parsedLimit,
    distinct: true
  });

  const totalPages = Math.ceil(count / parsedLimit);
  const currentPage = parseInt(page, 10) || 1;

  return res.status(200).json(
    new ApiResponse(200, {
      message: "Reviews fetched successfully",
      data: {
        reviews,
        pagination: {
          totalItems: count,
          totalPages,
          currentPage,
          itemsPerPage: parsedLimit,
          hasNextPage: currentPage < totalPages,
          hasPrevPage: currentPage > 1
        }
      }
    })
  );
});
const appoveReview=asyncHandler(async (req,res) => {
  try {
    const {id}=req.params;
    const review=await db.Review.findByPk(id)
    if(!review)
      throw new ApiError(400,"Review not found")
    if(review.isApproved)
      throw new ApiError(400,"Review is already approved")
    review.isApproved=true
    await review.save()
    await updateCourseRating(review.courseId)
         return res.status(200).json(
    new ApiResponse(200, {
      message: "Review approved successfully",
      data:{
        id:review.id,
        isApproved:review.isApproved
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
const rejectReview=asyncHandler(async (req,res) => {
  try {
    const {id}=req.params;
    const review=await db.Review.findByPk(id)
    if(!review)
      throw new ApiError(400,"Review not found")
    await review.destroy()
    await updateCourseRating(review.courseId)
         return res.status(200).json(
    new ApiResponse(200, {
      message: "Review rejected and deleted successfully",
    })
  );
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    }); 
  }
  
})
const clearReportFlag=asyncHandler(async (req,res) => {
  try {
    const {id}=req.params;
    const review=await db.Review.findByPk(id);
    if(!review)
       throw new ApiError(400,"review not found")
      review.reported=false;
      await review.save()
          return res.status(200).json(
    new ApiResponse(200, {
      message: "Report flag cleared successfully",
      data:{
        id:review.id,
        report:review.report
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
const getReportedReview=asyncHandler(async (req,res) => {
  try {
    const {page,limit}=req.query;
    const {offset,limit:parsedLimit}=getPagination(limit,page)
    const {count,rows:reviews}=await db.Review.findAndCountAll({
      where:{reported:true},
      include:[
        {
          model:db.User,
          as:"user",
          attributes:['id','firstName','avatar'],
          include:[{model:db.Course,as:"courses",attributes:['id','title']}]
        }
      ],
      order:[['createdAt',"DESC"]],
      offset,
      limit:parsedLimit,
      distinct:true
    })
    const totalPages=Math.ceil(count/parsedLimit)
    const currentPage=parseInt(page,10)||1
           return res.status(200).json(
    new ApiResponse(200, {
      message: "Reported reviews retrieved successfully",
      data: {
        reviews,
        pagination: {
          totalItems: count,
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
module.exports={
    createReview,
    getCourseReviews,
    getReviewById,
    updateReview,
    deleteReview,
    markHelpful,
    reportReview,
    getAllReviews,
    appoveReview,
    rejectReview,
    clearReportFlag,
    getReportedReview
}