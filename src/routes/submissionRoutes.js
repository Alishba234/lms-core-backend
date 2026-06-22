const express=require('express')
const router=express.Router()
const {createSubmission,getSubmissionById,deleteSubmission}=require('../controllers/submissionController')
const {upload}=require('../config/cloudinary')
const {protect}=require('../middleware/authMiddleware')
router.post('/create', protect, upload.fields([
    { name: 'attachmentUrl', maxCount: 1 },
  ]),createSubmission),
  router.get('/get/:id',protect,getSubmissionById)
  router.delete('/delete/:id',protect,deleteSubmission)
module.exports=router
