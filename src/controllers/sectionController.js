const ApiError =require ('../utils/apiError.js');
const ApiResponse= require ('../utils/apiResponse.js');
const asyncHandler =  require ('../middleware/asyncHandler.js');
const db=require('../models');
const { where, Op } = require('sequelize');
const { application } = require('express');

const validateCourseOwnerShip = async (courseId, userId, role) => {
    const course = await db.Course.findByPk(courseId) // FIX: findByPK → findByPk
 

    if (!course) throw new ApiError(400, "Course not found")

    if (role !== "admin" && course.instructorId !== userId) {
        throw new ApiError(400, "You are not authorized to manage this course")
    }

    return { success: true } 
}

const getNextOrder = async (courseId) => {
    const lastsection = await db.Section.findOne({
        where: { courseId },
        order: [['order', 'DESC']] 
    })

    return lastsection ? lastsection.order + 1 : 1
}

const reordertheRemaningSection = async (courseId, deleteOrder) => {

    const sections = await db.Section.findAll({ 
        where: {
            courseId,
            order: {
                [Op.gt]: deleteOrder 
            }
        },
        order: [['order', 'ASC']] 
    })

    for (const section of sections) {
        section.order = section.order - 1
        await section.save()
    }
}

const updateSectionstats = async (sectionId) => {
    const lectures = await db.Lecture.findAll({ 
        where: {
            sectionId,
            isPublished: true
        }
    })

    const totalLectures = lectures.length

    const totalDuration = lectures.reduce((sum, lecture) => {
        return sum + (lecture.duration || 0)
    }, 0)

    await db.Section.update( 
        {
            totalLectures,
            totalDuration,
        },
        {
            where: { id: sectionId },
        }
    )
}

const createSection = asyncHandler(async (req, res) => {
    try {

        const { title, description, order, courseId, isPublished } = req.body 

        if (!title || title.trim() === "")
            throw new ApiError(400, "Section title is required") 

        if (!courseId)
            throw new ApiError(400, "CourseId is required")

        const ownerShip = await validateCourseOwnerShip(
            courseId,
            req.user.id,   
            req.user.role
        )

        let finalorder = order

        if (!finalorder) {
            finalorder = await getNextOrder(courseId)
        }

        const existingOrder = await db.Section.findOne({
            where: {
                courseId,
                order: finalorder
            }
        })

        if (existingOrder)
            throw new ApiError(403, "Section Order already exists")

        const section = await db.Section.create({
            title: title.trim(),
            description: description ? description.trim() : null,
            order: finalorder,
            isPublished: isPublished || false,
            courseId,
            totalDuration: 0,
            totalLectures: 0,
        })

        return res.status(201).json(
            new ApiResponse(201, {
                message: "Section created successfully",
                data: { section }
            })
        )

    } catch (error) {
        console.log("Create Section Error:", error)

        return res.status(500).json({
            success: false,
            message: error.message,
        })
    }
})
const getSectionById=asyncHandler(async (req,res) => {
    try {
        const {id}=req.params;
        const section =await db.Section.findByPk(id,{
           include:[
            {
                model:db.Course,
                as:"courses"
            },
            {
                model:db.Lecture,
                as:"lectures"
            }
           ]

        })
        if(!section) throw new ApiError(404,"Section not found")
              return res.status(201).json(
            new ApiResponse(201, {
                message: "Section fetched successfully",
                data: { section }
            })
        )
    } catch (error) {
        console.log("Create Section Error:", error)

        return res.status(500).json({
            success: false,
            message: "Something went wrong",
        })
    }
    
})
const publishSection=asyncHandler(async (req,res) => {
    try {
        const {id}=req.params;
        const section=await db.Section.findByPk(id);
        if(!section) throw new ApiError(404,"Section not found")
            const ownerShip=await validateCourseOwnerShip(
          section.courseId,
            req.user.id,   
            req.user.role
        )
        if(!ownerShip.success) throw new ApiError(403).json(ownerShip)
            section.isPublished=true;
        await section.save()
           return res.status(201).json(
            new ApiResponse(201, {
                message: "Section published successfully",
            })
        )

    } catch (error) {
          console.log("Create Section Error:", error)

        return res.status(500).json({
            success: false,
            message: "Something went wrong",
        })
    }
    
})
const unplishedSection=asyncHandler(async (req,res) => {
 try {
     const {id}=req.params;
     const section=await db.Section.findByPk(id);
      if(!section) throw new ApiError(404,"Section not found")
       const ownerShip=await validateCourseOwnerShip(
   section.courseId,
   req.user.id,
   req.user.role
   )
   if(!ownerShip.success) throw new ApiError(403).json(ownerShip)
       section.isPublished=false,
   await section.save()
    return res.status(201).json(
               new ApiResponse(201, {
                   message: "Section unpublished successfully",
               })
           )
 } catch (error) {
    console.log("Create Section Error:", error)

        return res.status(500).json({
            success: false,
            message: "Something went wrong",
        })
 }
    
})
const deleteSection=asyncHandler(async (req,res) => {
  try {
       const { id } = req.params;
    const section=await db.Section.findByPk(id);
     if(!section) throw new ApiError(404,"Section not found")
        const ownerShip=await validateCourseOwnerShip(
    section.courseId,
    req.user.id,
    req.user.role,
    )
    if(!ownerShip.success) throw new ApiError(400).json(ownerShip)
   const deleteOrder = section.order;
    const courseId = section.courseId;
    await section.destroy();
    reordertheRemaningSection(deleteOrder,courseId)
     return res.status(201).json(
               new ApiResponse(201, {
                   message: "Section deleted successfully",
               })
           )

  } catch (error) {
     console.log("Create Section Error:", error)

        return res.status(500).json({
            success: false,
            message: "Something went wrong",
        })
  }  
    
})
const updatSection=asyncHandler(async (req,res) => {
    try {
        const {id}=req.params
        const {title,description,isPublished,order}=req.body;
        const section=await db.Section.findByPk(id);
        if(!section) throw new ApiError(400,"Section not found")
            const ownerShip=await validateCourseOwnerShip(section.courseId,req.user.id,req.user.role)
        if(order&&order!==section.order){
            const existingOrder=await db.Section.findOne({
                where:{
                    courseId:section.courseId,
                    order,
                    id:{
                        [Op.ne]:section.id
                    }
                }
            })
            if(existingOrder) throw new ApiError(400," Section order is already exist")
        }
        if(!ownerShip.success) throw new ApiError(403).json(ownerShip)
            section.title=title?title.trim():section.title
        section.description=description!==undefined?description.trim():section.description
        section.order=order||null
        if(typeof isPublished==="boolean"){
            section.isPublished=isPublished
        }
        await section.save()
  return res.status(201).json(
               new ApiResponse(201, {
                   message: "Section updated successfully",
               })
           )
        
    } catch (error) {
        console.log("Create Section Error:", error)

        return res.status(500).json({
            success: false,
            message: "Something went wrong",
        })
    }
    
})
const reorderSections = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { courseId, sections } = req.body;

    if (!courseId || !Array.isArray(sections)) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Course ID and sections array are required",
      });
    }

    const ownerShip = await validateCourseOwnerShip(
            courseId,
            req.user.id,   
            req.user.role
        )

    if (!ownerShip.success) {
      await transaction.rollback();
      return res.status(403).json(ownerShip);
    }

    const orders = sections.map((item) => item.order);
    const uniqueOrders = new Set(orders);

    if (orders.length !== uniqueOrders.size) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Duplicate orders are not allowed",
      });
    }

    for (const item of sections) {
      await db.Section.update(
        { order: item.order },
        {
          where: {
            id: item.sectionId,
            courseId,
          },
          transaction,
        }
      );
    }

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Sections reordered successfully",
    });
  } catch (error) {
    await transaction.rollback();

    console.log("Reorder Sections Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};
module.exports={
    createSection,
    getSectionById,
    publishSection,
    unplishedSection,
    deleteSection,
    updatSection,
    reorderSections
}
