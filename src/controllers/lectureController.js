const ApiError =require ('../utils/apiError.js');
const ApiResponse= require ('../utils/apiResponse.js');
const asyncHandler =  require ('../middleware/asyncHandler.js');
const db=require('../models');
const { Op } = require("sequelize");
const slugify = require("slugify");
const { where } = require('sequelize');
const {deleteImage,deleteVideo}=require('../config/cloudinary.js');

const extractPublicId = (url) => {
  if (!url) return null;
  const parts = url.split("/");
  const filename = parts[parts.length - 1];
  const publicId = filename.split(".")[0];
  return publicId;
};
const reordertheLecturesAfterDelete = async (sectionId, deleteOrder, transaction) => {
  await db.Lecture.update(
    { order: db.sequelize.literal('`order` - 1') },
    {
      where: {
        sectionId,
        order: { [Op.gt]: deleteOrder }
      },
      transaction
    }
  );
};
const checkCourseOwnerShipThroughSection = async (sectionId, user) => {
  const section = await db.Section.findByPk(sectionId, {
    include: [
      {
        model: db.Course,
        as: "courses"   // ✅ correct alias
      }
    ]
  });

  if (!section) {
    throw new Error("Section not found");
  }

  if (!section.courses) {
    throw new Error("Course not found for this section");
  }

  if (user.role !== "admin" && section.courses.instructorId !== user.id) {
    throw new Error("You are not authorized to modify lectures in this course");
  }

  return section.course;
};
const validateTheLectureTypeRequirments = (type, data) => {
  const errors = [];

  switch (type) {
    case "video":
      if (!data.videoUrl || data.videoUrl.trim() === "") {
        errors.push("Video URL is required");
      }
      break;

    case "article":
      if (!data.content || data.content.trim() === "") {
        errors.push("Content is required");
      }
      break;

    case "quiz":
      if (!data.content || data.content.trim() === "") {
        errors.push("Quiz content is required");
      }
      break;

    case "assignment":
      if (!data.content || data.content.trim() === "") {
        errors.push("Assignment description is required");
      }
      break;

    case "resource":
      if (!data.resourceUrl && !data.resourceFile) {
        errors.push("Resource URL or file is required");
      }
      break;

    default:
      errors.push("Invalid lecture type");
  }

  return {
    valid: errors.length === 0,
    errors
  };
};
const getNextOrderNumber=async (sectionId) => {
    const maxorder=await db.Lecture.max('order',{
        where:{sectionId}
    })
    return maxorder!==null?maxorder+1:1
    
}
const isOrderUnique=async (sectionId,order,excludeId=null) => {
    const whereCondition={
        sectionId,
        order
    }
    if(excludeId){
        whereCondition.id={[Op.ne]:excludeId}
    }
    const exsitingLecture=await db.Lecture.findOne({where:whereCondition})
    return !exsitingLecture
    
}
const ensureSinglePreviewLecture = async (sectionId, lectureId) => {
  await db.Lecture.update(
    { isPreview: false },
    {
      where: {
        sectionId,
        id: { [Op.ne]: lectureId },
        isPreview: true
      }
    }
  );
};
const createLectures = asyncHandler(async (req, res) => {
  try {
    const {
      title,
      description,
      order,
      type,
      content,
      videoUrl,
      videoDuration,
      resourceUrl,
      isPreview = false,
      isPublished = false,
      sectionId
    } = req.body;

    if (!title || title.trim() === "") {
      throw new ApiError(400, "Lecture title is required");
    }

    if (!type || !["video", "article", "assignment", "resource", "quiz"].includes(type)) {
      throw new ApiError(400, "Invalid lecture type");
    }

    if (!sectionId) {
      throw new ApiError(400, "SectionId is required");
    }

    await checkCourseOwnerShipThroughSection(sectionId, req.user);

    const validation = validateTheLectureTypeRequirments(type, {
      content,
      videoUrl,
      resourceUrl,
      resourceFile: req.files?.resourceFile
    });

    if (!validation.valid) {
      throw new ApiError(400, validation.errors.join(", "));
    }

    let finalOrder = order;

    if (!finalOrder) {
      finalOrder = await getNextOrderNumber(sectionId);
    } else {
      const isUnique = await isOrderUnique(sectionId, finalOrder);
      if (!isUnique) {
        throw new ApiError(400, `Order ${finalOrder} already exists`);
      }
    }

    let finalResourceUrl = resourceUrl;

    if (req.files?.resourceFile) {
      finalResourceUrl = req.files.resourceFile[0].path;
    }

    const lecture = await db.Lecture.create({
      title: title.trim(),
      description: description ? description.trim() : null,
      order: finalOrder,
      type,
      content: content || null,
      videoUrl: videoUrl || null,
      videoDuration: videoDuration ? parseInt(videoDuration) : null,
      resourceUrl: finalResourceUrl,
      isPreview: isPreview === true || isPreview === "true",
      isPublished: isPublished === true || isPublished === "true",
      sectionId
    });

    if (lecture.isPreview) {
      await ensureSinglePreviewLecture(sectionId, lecture.id);
    }
    const createLectures=await db.Lecture.findByPk(lecture.id,{
        include:[
            {
                model:db.Section,
                as:"section",
                include:[{model:db.Course,as:"courses"}]
            }
        ]
    })

    return res.status(201).json(
      new ApiResponse(201, {
        message: "Lecture created successfully",
        data: {createLectures}
      })
    );

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
const getLectureBySection=async (req,res) => {
    try {
        const {sectionId}=req.params;
        const section=await db.Section.findByPk(sectionId,{
            include:[{
                model:db.Course,
                as:"courses"
            }]

        })
        if(!section)
            throw new ApiError(400,"section not found")
        const isAuthorized=req.user && (req.user.role==="admin" || section.courses.instructorId===req.user.id)
        const where={sectionId}
        if(isAuthorized){
            where.isPublished=true
        }
        const lectures=await db.Lecture.findAll({
            where,
            order:[["order","ASC"]],
            include:[{model:db.Section,as:"section",attributes:['id',"title","courseId"]}]
        })
         return res.status(201).json(
      new ApiResponse(201, {
        message: "Lecture retrieved successfully",
        data: {lectures}
      })
    );
    } catch (error) {
        return res.status(500).json({
      success: false,
      message: error.message
    }); 
    }
    
}
const getLectureById=asyncHandler(async (req,res) => {
    try {
        const {lectureId}=req.params;
        const lecture=await db.Lecture.findByPk(lectureId,{
            include:[
                {
                    model:db.Section,
                    as:"section",
                    include:[{model:db.Course,as:"courses"}]
                },
               
            ]
        })
        if(!lecture)
            throw new ApiError(400,"Lecture not found")
        if(!lecture.isPublished){
            const isAuthorized=req.user &&(req.user.role==="admin" || lecture.section.courses.instructorId===req.user.id)
            if(!isAuthorized)
                throw new ApiError(400,"Lecture is not published yet")


        }
           return res.status(201).json(
      new ApiResponse(201, {
        message: "Lectures retrieved successfully",
        data: {lecture}
      })
    );

    } catch (error) {
          return res.status(500).json({
      success: false,
      message: error.message
    }); 
    }
    
})
const publishLecture = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const lecture = await db.Lecture.findByPk(id, {
      include: [
        {
          model: db.Section,
          as: "section",
          include: [
            {
              model: db.Course,
              as: "courses" // ✅ correct alias
            }
          ]
        }
      ]
    });

    if (!lecture) {
      throw new ApiError(404, "Lecture not found");
    }

    if (!lecture.section || !lecture.section.courses) {
      throw new ApiError(404, "Related course not found");
    }

    // ✅ FIXED AUTH LOGIC
    if (
      req.user.role !== "admin" &&
      lecture.section.courses.instructorId !== req.user.id
    ) {
      throw new ApiError(403, "You are not authorized to publish this lecture");
    }

    lecture.isPublished = true;
    await lecture.save();

    return res.status(200).json(
      new ApiResponse(200, {
        message: "Lecture published successfully",
        data: {
          id: lecture.id,
          isPublished: lecture.isPublished, // ✅ fixed
          title: lecture.title,
          type: lecture.type
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
const unpublishedLecture=asyncHandler(async (req,res) => {
  try {
    const {id}=req.params;
    const lecture=await db.Lecture.findByPk(id,{
      include:[
        {
          model:db.Section,
          as:"section",
          include:[{model:db.Course,as:"courses"}]
        }
      ]
    })
    if(!lecture)
      throw new ApiError(400,"Lecture not found")
    if(!lecture.section|| !lecture.section.courses)
      throw new ApiError(400,"Related course not found")
    if(req.user.role!=="admin"&& lecture.section.courses.instructorId!==req.user.id)
      throw new ApiError(403,"You are not authorized to unplished of this lecture")
    lecture.isPublished=false;
    await lecture.save()
      return res.status(200).json(
      new ApiResponse(200, {
        message: "Lecture unpublished successfully",
        data: {
          id: lecture.id,
          isPublished: lecture.isPublished, // ✅ fixed
          title: lecture.title,
          type: lecture.type
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
const deleteLecture = asyncHandler(async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { id } = req.params;

    const lecture = await db.Lecture.findByPk(id, {
      include: [
        {
          model: db.Section,
          as: "section",
          include: [
            {
              model: db.Course,
              as: "courses" // ✅ same as your requirement
            }
          ]
        }
      ],
      transaction
    });

   
    if (!lecture) {
      await transaction.rollback();
      throw new ApiError(404, "Lecture not found");
    }

    
    if (
      req.user.role !== "admin" &&
      (!lecture.section ||
        !lecture.section.courses ||
        lecture.section.courses.instructorId !== req.user.id)
    ) {
      await transaction.rollback();
      throw new ApiError(
        403,
        "You are not authorized to delete this lecture"
      );
    }


    if (lecture.resourceUrl) {
      const publicId = extractPublicId(lecture.resourceUrl);
      if (publicId) {
        await deleteImage(publicId);
      }
    }

    const deletedOrder = lecture.order;
    const sectionId = lecture.sectionId;


    await lecture.destroy({ transaction });

    await reordertheLecturesAfterDelete(
      sectionId,
      deletedOrder,
      transaction
    );

    await transaction.commit();

   
    return res.status(200).json(
      new ApiResponse(200, {
        message: "Lecture deleted successfully"
      })
    );

  } catch (error) {
    await transaction.rollback();

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
const updateLecture = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title,
      description,
      order,
      type,
      content,
      resourceUrl,
      isPreview,
      isPublished,
      videoDuration,
      videoUrl,
    } = req.body;

    const lecture = await db.Lecture.findByPk(id, {
      include: [
        {
          model: db.Section,
          as: "section",
          include: [{ model: db.Course, as: "courses" }]
        }
      ]
    });

    if (!lecture) {
      throw new ApiError(404, "Lecture not found");
    }

    if (
      req.user.role !== "admin" &&
      (!lecture.section ||
        !lecture.section.courses ||
        lecture.section.courses.instructorId !== req.user.id)
    ) {
      throw new ApiError(403, "You are not authorized to update this lecture");
    }

    const finalType = type || lecture.type;

   
    if (type && type !== lecture.type) {
      const validation = validateTheLectureTypeRequirments(finalType, {
        videoUrl: videoUrl || lecture.videoUrl,
        content: content || lecture.content,
        resourceUrl: resourceUrl || lecture.resourceUrl,
        resourceFile: req.files?.resourceFile
      });

      if (!validation.valid) {
        throw new ApiError(400, validation.errors.join(", "));
      }

      lecture.type = finalType;
    }

    if (title && title.trim() !== "") {
      lecture.title = title.trim();
    }

    if (description !== undefined) {
      lecture.description = description ? description.trim() : null;
    }

   
    if (order !== undefined && order !== lecture.order) {
      const isUnique = await isOrderUnique(lecture.sectionId, order, id);
      if (!isUnique) {
        throw new ApiError(400, "Lecture already exists with this order");
      }
      lecture.order = order;
    }

    if (content !== undefined) {
      lecture.content = content;
    }

    if (videoUrl !== undefined) {
      lecture.videoUrl = videoUrl;
    }

    if (videoDuration !== undefined) {
      lecture.videoDuration = parseInt(videoDuration);
    }

    if (req.files && req.files.resourceFile) {
      if (lecture.resourceUrl) {
        const publicId = extractPublicId(lecture.resourceUrl);
        if (publicId) {
          await deleteImage(publicId);
        }
      }
      lecture.resourceUrl = req.files.resourceFile[0].path;
    } else if (resourceUrl !== undefined) {
      lecture.resourceUrl = resourceUrl;
    }

    if (isPreview !== undefined) {
      lecture.isPreview = isPreview === true || isPreview === "true";

      if (lecture.isPreview) {
        await ensureSinglePreviewLecture(lecture.sectionId, lecture.id);
      }
    }

    if (isPublished !== undefined) {
      lecture.isPublished = isPublished === true || isPublished === "true";
    }

  
    await lecture.save();

    const updatedLecture = await db.Lecture.findByPk(id, {
      include: [
        {
          model: db.Section,
          as: "section",
          include: [
            {
              model: db.Course,
              as: "courses",
              attributes: ["id", "instructorId", "title"]
            }
          ]
        }
      ]
    });

    return res.status(200).json(
      new ApiResponse(200, {
        message: "Lecture updated successfully",
        data: updatedLecture   
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
    createLectures,
    getLectureBySection,
    getLectureById,
    publishLecture,
    unpublishedLecture,
    deleteLecture,
    updateLecture
}