const ApiError =require ('../utils/apiError.js');
const ApiResponse= require ('../utils/apiResponse.js');
const asyncHandler =  require ('../middleware/asyncHandler.js');
const db=require('../models');
const { Op } = require("sequelize");
const slugify = require("slugify");
const { where } = require('sequelize');
const {deleteImage,deleteVideo}=require('../config/cloudinary.js');
const { unplishedSection } = require('./sectionController.js');

//helper funtions

const isOwnerOrAdmin = (course, user) => {
  return user.role === "admin" || course.instructorId === user.id;
};

const buildSearchQuery = (search) => {
  if (!search || search.trim() === "") return {};
  
  return {
    [Op.or]: [
      { title: { [Op.like]: `%${search.trim()}%` } },
      { description: { [Op.like]: `%${search.trim()}%` } },
      { shortDescription: { [Op.like]: `%${search.trim()}%` } },
      { keywords: { [Op.like]: `%${search.trim()}%` } }
    ]
  };
};

const getPagination = (page = 1, limit = 10) => {
  const parsedPage = parseInt(page, 10);
  const parsedLimit = parseInt(limit, 10);
  
  const validPage = parsedPage > 0 ? parsedPage : 1;
  const validLimit = parsedLimit > 0 && parsedLimit <= 100 ? parsedLimit : 10;
  
  const offset = (validPage - 1) * validLimit;
  
  return { offset, limit: validLimit };
};

const generateUniqueSlug = async (title, excludeId = null) => {
  let baseSlug = slugify(title, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g
  });
  
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const whereCondition = { slug };
    if (excludeId) {
      whereCondition.id = { [Op.ne]: excludeId };
    }
    
    const existingCourse = await db.Course.findOne({ where: whereCondition });
    if (!existingCourse) break;
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
};
const extractPublicId = (url) => {
  if (!url) return null;
  const parts = url.split("/");
  const filename = parts[parts.length - 1];
  const publicId = filename.split(".")[0];
  return publicId;
};
const updateCourseState = async (courseId) => {
  const sections = await db.Section.findAll({
    where: {
      courseId,
      isPublished: true
    },
    include: [
      {
        model: db.Lecture,
        as: "lectures",
        where: {
          isPublished: true
        },
        required: false,
        attributes: ["videoDuration"]
      }
    ]
  });

  let totalLectures = 0;
  let totalDuration = 0;

  sections.forEach(section => {
    if (section.lectures && section.lectures.length > 0) {
      totalLectures += section.lectures.length;

      section.lectures.forEach(lecture => {
        totalDuration += lecture.videoDuration || 0;
      });
    }
  });

  const reviewStats = await db.Review.findAll({
    where: { courseId },
    attributes: [
      [db.sequelize.fn("AVG", db.sequelize.col("rating")), "avgRating"],
      [db.sequelize.fn("COUNT", db.sequelize.col("id")), "totalReviews"]
    ],
    raw: true
  });

  const avgRating = parseFloat(reviewStats[0].avgRating) || 0;
  const totalReviews = parseInt(reviewStats[0].totalReviews) || 0;

  const totalStudents = await db.Enrollment.count({
    where: {
      courseId,
      status: "active"
    }
  });

  const course = await db.Course.findByPk(courseId);

  if (course) {
    course.totalDuration = totalDuration;
    course.totalLectures = totalLectures;
    course.totalReviews = totalReviews;
    course.averageRating = avgRating;
    course.totalStudents = totalStudents;

    await course.save();
  }

  return course;
};


const createCourse=asyncHandler(async (req,res) => {
  try {
    const {title,description,shortDescription,instructorId,categoryId,level,language,keywords,price,discountPrice,requirements}=req.body;
    if(!title||title.trim()==="") 
      throw new ApiError (400,"Course titke is required")
      if(!description||description.trim()==="") 
        throw new ApiError(400,"Course description is required")
      if(!level||!["beginner", "intermediate", "advanced"].includes(level))
        throw new ApiError(403,"Invalid level")
      if(categoryId){
        const categoryExist=await db.Category.findByPk(categoryId)
        if(!categoryExist)
          throw new ApiError(403,"Category not found")
      }
    
     let finalInstructorId;

if (req.user.role === "admin") {
  if (instructorId) {
    const instructor = await db.User.findByPk(instructorId);

    if (!instructor || instructor.role !== "instructor") {
      throw new ApiError(
        400,
        "Invalid instructor ID. User must be an instructor."
      );
    }

    finalInstructorId = instructorId;
  } else {
    finalInstructorId = req.user.id;
  }
} else if (req.user.role === "instructor") {
  finalInstructorId = req.user.id;
} else {
  throw new ApiError(
    400,
    "Only instructors and admins can create courses"
  );
} 
console.log(req.user);
console.log(req.user.role);
      const finalPrice=parseFloat(price)||0;
      const finalDiscountPrice=finalPrice?parseFloat(discountPrice):null
      const isFree=finalPrice<=0;
          // Generate unique slug
    const slug = await generateUniqueSlug(title);

      let thumbnailUrl = null;

if (req.files && req.files.thumbnail) {
  thumbnailUrl = req.files.thumbnail[0].path;
}
   
      let previewVideoUrl = null;

if (req.files && req.files.previewVideo) {
  previewVideoUrl = req.files.previewVideo[0].path;
}
       let keywordsArray = [];
    if (keywords) {
      try {
        keywordsArray = typeof keywords === "string" ? JSON.parse(keywords) : keywords;
      } catch (error) {
        keywordsArray = keywords.split(",").map(k => k.trim());
      }
    }
        let requirementsArray = [];
    if (requirements) {
      try {
        requirementsArray = typeof requirements === "string" ? JSON.parse(requirements) : requirements;
      } catch (error) {
        requirementsArray = requirements.split(",").map(r => r.trim());
      }
    }
    const course=await db.Course.create({
      title:title.trim(),
      description:description.trim(),
      shortDescription:shortDescription?shortDescription.trim():null,
      thumbnail:thumbnailUrl,
      previewVideo:previewVideoUrl,
      price:finalPrice,
      discountPrice:finalDiscountPrice,
      isFree,
      slug,
      isPublished:true,
      keywords:keywordsArray,
      requirements:requirementsArray,
      language:language||"English",
      categoryId:categoryId||null,
      instructorId:finalInstructorId,
      status:"draft"

    })
    //Fetched created course with relations;
    const createdCourse=await db.Course.findByPk(course.id,{
      include:[
        {
          model:db.User,
          as:"instructor",
          attributes:['firstName',"email","id"],
        },
        {
          model:db.Category,
          as:"category",
          attributes:["id","name"]
        }
      ]
    })
     return res.status(201).json(
            new ApiResponse(201, {
                message: "Course created successfully",
                data: {createdCourse }
            })
        )

  } catch (error) {
  
    return res.status(500).json({
      success: false,
      message:error.message
    });
  }
  
})
const getCourseById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const course = await db.Course.findByPk(id, {
      include: [
        {
          model: db.User,
          as: "instructor",
          attributes: ["id", "firstName", "email", "bio"],
        },
        {
          model: db.Category,
          as: "category",
          attributes: ["name", "description"],
        },
        {
          model: db.Section,
          as: "sections",
          where: { isPublished: true },
          required: false,
          include: [
            {
              model: db.Lecture,
              as: "lectures",
              where: { isPublished: true },
              required: false,
              attributes: ["title", "description"],
            },
          ],
        },
      ],
      order: [
        [{ model: db.Section, as: "sections" }, "order", "ASC"],
        [
          { model: db.Section, as: "sections" },
          { model: db.Lecture, as: "lectures" },
          "order",
          "ASC",
        ],
      ],
    });

    if (!course) {
      throw new ApiError(404, "Course not found");
    }

    const isAuthorized =
      req.user &&
      (
        req.user.role === "admin" ||
        course.instructorId === req.user.id
      );

    if (!course.isPublished && !isAuthorized) {
      throw new ApiError(403, "Course is not published yet");
    }

    return res.status(200).json(
      new ApiResponse(200, {
        message: "Course fetched successfully",
        data: course,
      })
    );
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
const getCourseBySlug = asyncHandler(async (req, res) => {
  try {
    const { slug } = req.params;

    const course = await db.Course.findOne({
      where: { slug },
      include: [
        {
          model: db.User,
          as: "instructor",
          attributes: ["id", "firstName", "email"],
        },
        {
          model: db.Category,
          as: "category",
          attributes: ["name", "description"],
        },
        {
          model: db.Section,
          as: "sections",
          where: { isPublished: true },
          required: false,
          include: [
            {
              model: db.Lecture,
              as: "lectures",
              where: { isPublished: true },
              required: false,
              attributes: ["title", "description", "order"],
            },
          ],
        },
      ],
      order: [
        [{ model: db.Section, as: "sections" }, "order", "ASC"],
        [
          { model: db.Section, as: "sections" },
          { model: db.Lecture, as: "lectures" },
          "order",
          "ASC",
        ],
      ],
    });

    if (!course) {
      throw new ApiError(404, "Course not found");
    }

    const isAuthorized =
      req.user &&
      (req.user.role === "admin" || course.instructorId === req.user.id);

    if (!course.isPublished && !isAuthorized) {
      throw new ApiError(403, "Course is not Published yet");
    }

    return res.status(200).json(
      new ApiResponse(200, {
        message: "Course fetched successfully",
        data: course,
      })
    );
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
const deleteCourse=asyncHandler(async (req,res) => {
try {
    const {id}=req.params;
    const course=await db.Course.findByPk(id);
    if(!course)
      throw new ApiError(404,"Course not found")
    if(!isOwnerOrAdmin)
      throw new ApiError (403,"You are not authorized to delete this course")
     // delete thumbnail
    if (course.thumbnail) {
      const publicId = extractPublicId(course.thumbnail);
      if (publicId) {
        await deleteImage(publicId);
      }
    }

    // delete video (IMPORTANT FIX)
    if (course.previewVideo) {
      const publicId = extractPublicId(course.previewVideo);
      if (publicId) {
        await deleteVideo(publicId); // FIXED HERE
      }
    }
    await course.destroy()
  return res.status(200).json(
      new ApiResponse(200, {
        message: "Course deleted successfully",
      })
    );
} catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
}
  
})
const publishCourse=asyncHandler(async (req,res) => {
  try {
    const {id}=req.params;
    const course=await db.Course.findByPk(id);
    if(!course)
      throw new ApiError(403,"Course not found")
    if(!isOwnerOrAdmin)
      throw new ApiError(403,"You are not authorized to publish this course")
     course.isPublished=true,
     course.status="Published",
     course.publishedAt=new Date()
     await course.save()
       return res.status(200).json(
      new ApiResponse(200, {
        message: "Course published successfully",
        data:{
          id:course.id,
          title:course.title,
          status:course.status,
          isPublished:course.isPublished,
          publishedAt:course.publishedAt
        }
      })
    );
  } catch (error) {
      return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
  
})
const unPublishCourse=asyncHandler(async (req,res) => {
  try {
    const {id}=req.params;
    const course=await db.Course.findByPk(id)
    if(!course)
      throw new ApiError(404,"Course not found")
    if(!isOwnerOrAdmin)
      throw new ApiError(403,"You are not Authorized to UnPublish of this Course")
    course.status="draft",
    course.isPublished=false,
    course.publishedAt=null,
    await course.save()
     return res.status(200).json(
      new ApiResponse(200, {
        message: "Course unpublished successfully",
        data:{
          id:course.id,
          title:course.title,
          status:course.status,
          isPublished:course.isPublished,
          publishedAt:course.publishedAt
        }
      })
    );
  } catch (error) {
     return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
  
})
const getInstructorCourse = asyncHandler(async (req, res) => {
  try {
    const { page, limit, status, categoryId } = req.query;

    const { offset, limit: parsedLimit } = getPagination(page, limit);

    const where = {
      instructorId: req.user.id
    };
    console.log("req.user:", req.user);
console.log("Instructor ID:", req.user.id);
console.log("Where:", where);

    if (status && ["draft", "Published"].includes(status)) {
      where.status = status;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const { count, rows: courses } = await db.Course.findAndCountAll({
      where,
      attributes: [
        "id",
        "title",
        "totalStudents",
        "slug",
        "thumbnail",
        "isPublished",
        "publishedAt",
        "averageRating"
      ],
      include: [
        {
          model: db.Category,
          as: "category",
          attributes: ["id", "name"]
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
        message: "Your courses fetched successfully",
        data: {
          courses,
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
const getAdminCourses = asyncHandler(async (req, res) => {
  try {
    const { limit, page, status, search, categoryId, instructorId } = req.query;

    const { offset, limit: parsedLimit } = getPagination(page, limit);

    const where = {};

    if (status && ["draft", "Published"].includes(status)) {
      where.status = status;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (instructorId) {
      where.instructorId = instructorId;
    }

    Object.assign(where, buildSearchQuery(search));

    const { count, rows: courses } = await db.Course.findAndCountAll({
      where,
      include: [
        {
          model: db.User,
          as: "instructor",
          attributes: ["id", "firstName", "email"]
        },
        {
          model: db.Category,
          as: "category",
          attributes: ["id", "name"]
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
        message: "All courses fetched successfully",
        data: {
          courses,
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
const getFeaturedCourse = asyncHandler(async (req, res) => {
  try {
    const { limit } = req.query;

    const parsedLimit = Math.min(parseInt(limit, 10) || 10, 50);

    const courses = await db.Course.findAll({
      where: {
        isPublished: true,
        status: "Published"
      },
      attributes: [
        "id",
        "title",
        "description",
        "price",
        "discountPrice",
        "averageRating",
        "totalReviews",
        "totalStudents",
        "level"
      ],
      include: [
        {
          model: db.User,
          as: "instructor",
          attributes: ["id", "firstName", "email"]
        },
        {
          model: db.Category,
          as: "category",
          attributes: ["id", "name"]
        }
      ],
      order: [
        ["averageRating", "DESC"],
        ["totalStudents", "DESC"],
        ["totalReviews", "DESC"]
      ],
      limit: parsedLimit
    });

    return res.status(200).json(
      new ApiResponse(200, {
        message: "Courses fetched successfully",
        data: courses
      })
    );
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
const getAllCourses = asyncHandler(async (req, res) => {
  try {
    const {
      limit,
      page,
      search,
      minPrice,
      maxPrice,
      categoryId,
      level,
      isFree,
      language,
      sortBy = "newest"
    } = req.query;

    const { offset, limit: parsedLimit } = getPagination(page, limit);

    const where = {
      isPublished: true,
      status: "Published"
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (level && ["beginner", "intermediate", "advanced"].includes(level)) {
      where.level = level;
    }

    if (language) {
      where.language = language;
    }

    if (isFree !== undefined && isFree !== "") {
      where.isFree = isFree === "true";
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};

      if (minPrice !== undefined) {
        where.price[Op.gte] = parseFloat(minPrice);
      }

      if (maxPrice !== undefined) {
        where.price[Op.lte] = parseFloat(maxPrice);
      }
    }

    Object.assign(where, buildSearchQuery(search));

    // FIXED ORDER LOGIC
    let order = [];

    switch (sortBy) {
      case "price_low":
        order = [["price", "ASC"]];
        break;

      case "price_high":
        order = [["price", "DESC"]];
        break;

      case "rating_high":
        order = [["averageRating", "DESC"]];
        break;

      case "most_students":
        order = [["totalStudents", "DESC"]];
        break;

      case "oldest":
        order = [["createdAt", "ASC"]];
        break;

      case "newest":
      default:
        order = [["createdAt", "DESC"]];
        break;
    }

    const { count, rows: courses } = await db.Course.findAndCountAll({
      where,
      attributes: [
        "id",
        "title",
        "slug",
        "shortDescription",
        "thumbnail",
        "price",
        "discountPrice",
        "level",
        "language",
        "averageRating",
        "totalReviews",
        "totalStudents",
        "totalDuration",
        "totalLectures",
        "instructorId",
        "categoryId"
      ],
      include: [
        {
          model: db.User,
          as: "instructor",
          attributes: ["id", "firstName", "email"]
        },
        {
          model: db.Category,
          as: "category",
          attributes: ["id", "name"]
        }
      ],
      order,
      limit: parsedLimit,
      offset,
      distinct: true
    });

    const totalPages = Math.ceil(count / parsedLimit);
    const currentPage = parseInt(page, 10) || 1;

    return res.status(200).json(
      new ApiResponse(200, {
        message: "All courses fetched successfully",
        data: {
          courses,
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
const updateCourse = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title,
      description,
      shortDescription,
      price,
      discountPrice,
      level,
      language,
      requirements,
      categoryId,
      keywords,
      status
    } = req.body;

    const course = await db.Course.findByPk(id);

    if (!course) {
      throw new ApiError(404, "Course not found");
    }

    if (!isOwnerOrAdmin) {
      throw new ApiError(403, "You are not authorized to update this course");
    }

    if (description !== undefined) {
      course.description = description ? description.trim() : null;
    }

    if (shortDescription !== undefined) {
      course.shortDescription = shortDescription ? shortDescription.trim() : null;
    }

    if (title && title.trim() !== course.title) {
      const trimmedTitle = title.trim();
      course.title = trimmedTitle;
      course.slug = await generateUniqueSlug(trimmedTitle, id);
    }

    if (price !== undefined) {
      const finalPrice = parseFloat(price);

      if (isNaN(finalPrice)) {
        throw new ApiError(400, "Invalid price");
      }

      course.price = finalPrice;
      course.isFree = finalPrice <= 0;
    }

    if (discountPrice !== undefined) {
      const finalDiscountPrice = discountPrice ? parseFloat(discountPrice) : null;

      if (finalDiscountPrice !== null && isNaN(finalDiscountPrice)) {
        throw new ApiError(400, "Invalid discount price");
      }

      course.discountPrice = finalDiscountPrice;
    }

    if (level && ["beginner", "intermediate", "advanced"].includes(level)) {
      course.level = level;
    }

    if (categoryId !== undefined) {
      if (categoryId) {
        const categoryExist = await db.Category.findByPk(categoryId);

        if (!categoryExist) {
          throw new ApiError(404, "Category not found");
        }
      }

      course.categoryId = categoryId || null;
    }

    if (requirements !== undefined) {
      try {
        course.requirements =
          typeof requirements === "string"
            ? JSON.parse(requirements)
            : requirements;
      } catch (error) {
        course.requirements = requirements
          .split(",")
          .map(r => r.trim());
      }
    }

    if (keywords !== undefined) {
      try {
        course.keywords =
          typeof keywords === "string"
            ? JSON.parse(keywords)
            : keywords;
      } catch (error) {
        course.keywords = keywords
          .split(",")
          .map(k => k.trim());
      }
    }

    if (status && ["draft", "Published"].includes(status)) {
      course.status = status;

      if (status === "Published") {
        course.isPublished = true;
        course.publishedAt = new Date();
      } else {
        course.isPublished = false;
        course.publishedAt = null;
      }
    }

    if (language !== undefined) {
      course.language = language;
    }

    if (req.files && req.files.thumbnail) {
      if (course.thumbnail) {
        const publicId = extractPublicId(course.thumbnail);

        if (publicId) {
          await deleteImage(publicId);
        }
      }

      course.thumbnail = req.files.thumbnail[0].path;
    }

    if (req.files && req.files.previewVideo) {
      if (course.previewVideo) {
        const publicId = extractPublicId(course.previewVideo);

        if (publicId) {
          await deleteVideo(publicId);
        }
      }

      course.previewVideo = req.files.previewVideo[0].path;
    }

    await course.save();

    await updateCourseState(id);

    const updatedCourse = await db.Course.findByPk(course.id, {
      include: [
        {
          model: db.User,
          as: "instructor",
          attributes: ["id", "firstName", "email"]
        },
        {
          model: db.Category,
          as: "category",
          attributes: ["id", "name"]
        }
      ]
    });

    return res.status(200).json(
      new ApiResponse(200, {
        message: "Course updated successfully",
        data: { course: updatedCourse }
      })
    );
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
module.exports={
  createCourse,
  getCourseById,
  getCourseBySlug,
  deleteCourse,
  publishCourse,
  unPublishCourse,
  getInstructorCourse,
  getAdminCourses,
  getFeaturedCourse,
  getAllCourses,
  updateCourse
}




