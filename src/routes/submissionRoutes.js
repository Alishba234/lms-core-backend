const express=require('express')
const router=express.Router()
const {createSubmission,getSubmissionById}=require('../controllers/submissionController')
const {upload}=require('../config/cloudinary')
const {protect}=require('../middleware/authMiddleware')
router.post('/create', protect, upload.fields([
    { name: 'attachmentUrl', maxCount: 1 },
  ]),createSubmission),
  router.get('/get/:id',protect,getSubmissionById)
module.exports=router
