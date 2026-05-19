const express=require('express')
const router=express.Router()
const {createAssigment,getAllAssigments, deleteAssigment,getAssigmentsById,pulishAssigment,unpulishAssigment}=require('../controllers/assigmentController')
const {protect}=require('../middleware/authMiddleware')
const {upload}=require('../config/cloudinary')
router.post('/create', protect, upload.fields([
    { name: 'attachmentUrl', maxCount: 1 },
  ]), createAssigment),
router.get('/get',getAllAssigments)
router.get('/get/:id',getAssigmentsById)
router.delete('/:id',protect,deleteAssigment)
router.patch('/:id/publish',protect,pulishAssigment)
router.patch('/:id/unpublish',protect,unpulishAssigment)
   
module.exports=router