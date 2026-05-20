const express=require('express')
const router=express.Router()
const {createSubmission}=require('../controllers/submissionController')
const {upload}=require('../config/cloudinary')
const {protect}=require('../middleware/authMiddleware')
router.post('/create', protect, upload.fields([
    { name: 'attachmentUrl', maxCount: 1 },
  ]),createSubmission),
module.exports=router
