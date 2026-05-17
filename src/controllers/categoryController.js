const ApiError =require ('../utils/apiError.js');
const ApiResponse= require ('../utils/apiResponse.js');
const asyncHandler =  require ('../middleware/asyncHandler.js');
const db=require('../models');
const { where } = require('sequelize');

const hasAssociatedCourses = async (categoryId) => {
  const courseCount = await Course.count({ where: { categoryId } });
  return courseCount > 0;
};
const createCategory=asyncHandler(async (req,res) => {
    try {
        const {name,description}=req.body;
        if(!name) throw new ApiError(401,"Please provide name")
            const existingCategory=await db.Category.findOne({
        where:{name}
    })
    if(existingCategory) throw new ApiError (400,"Category with this name is already exist")
        const category=await db.Category.create({
    name:name.trim(),
    description:description||null,
    isActive:true
})
res.status(201).json(
    new ApiResponse(200,{
        message:"Category created successfully",
        data:{
            category
        }
    })
) 
    } catch (error) {
     console.error("Category created error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error creating category",
    });   
    }
    
})
const getCategoryById=asyncHandler(async (req,res) => {
    try {
        const {id}=req.params;
        const category=await db.Category.findByPk(id,{
            attributes:['id','name','description']
        })
        if(!category) throw new ApiError(401,"Category not found")
            res.status(201).json(
    new ApiResponse(200,{
        message:"Category fetched successfully",
        data:{
            category
        }
    })
)
    } catch (error) {
        return res.status(500).json({message:error.message})
    }
    
})
const deleteCategory=asyncHandler(async (req,res) => {
    try {
        const {id}=req.params;
        const category=await db.Category.findByPk(id)
        if(!category) throw new ApiError(401,"Category not found")
            if(category.deletedAt!==null) throw new ApiError(400,"Category is already deleted")
                 // Check if category has associated courses
    // const hasCourses = await hasAssociatedCourses(id);
    // if (hasCourses) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Cannot delete category because it has associated courses. Please reassign or delete the courses first."
    //   });
    // }
    await category.destroy()
          res.status(201).json(
    new ApiResponse(200,{
        message:"Category deleted successfully",
        
    })
)

    } catch (error) {
         return res.status(500).json({message:error.message})
    }
    
})
const updateCategory=asyncHandler(async (req,res) => {
    try {
        const {id}=req.params;
        const {description,name,isActive}=req.body;
        const category=await db.Category.findByPk(id)
        if(!category) throw new ApiError(401,"Category not found")
            const isCategoryNameDuplicate=await db.Category.findOne({
        where:{name}
        })
        if(isCategoryNameDuplicate) throw new ApiError (401,"Categoey with this name is already exist")
            if(description!==undefined) category.description=description||null
        if(isActive!==undefined) category.isActive=isActive===true||isActive==="true"
        await category.save()
          res.status(201).json(
    new ApiResponse(200,{
        message:"Category updated successfully",
        data:{
            category
        }
    })
)
    } catch (error) {
          return res.status(500).json({message:error.message})
    }
    
})
module.exports={createCategory,getCategoryById,deleteCategory,updateCategory}