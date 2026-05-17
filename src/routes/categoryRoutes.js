const express=require('express')
const router=express.Router()
const {createCategory,getCategoryById,deleteCategory,updateCategory}=require('../controllers/categoryController')
router.post('/create',createCategory)
router.get('/:id',getCategoryById)
router.delete('/:id',deleteCategory)
router.put('/:id',updateCategory)
module.exports=router