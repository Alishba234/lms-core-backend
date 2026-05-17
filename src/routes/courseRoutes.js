const express=require('express')
const router=express.Router()
const {
   createCourse,
   getCourseById,
   getCourseBySlug,
   deleteCourse,
   updateCourse,
   getAllCourses,
   getFeaturedCourse,
   getAdminCourses,
   getInstructorCourse,
   publishCourse,
   unPublishCourse
   }=require('../controllers/courseController')
const {upload}=require('../config/cloudinary')
const {protect}=require('../middleware/authMiddleware')
   router.get('/featured',getFeaturedCourse)
   router.get('/all',getAllCourses)
router.post('/create',protect,
     upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'previewVideo', maxCount: 1 },
  ]),
     createCourse)
     router.get('/:id',protect,getCourseById)
     router.get('/slug/:slug',protect,getCourseBySlug)
     router.delete('/delete/:id',protect,deleteCourse)
     router.patch('/publish/:id',protect,publishCourse)
   router.patch('/update/:id',protect, upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'previewVideo', maxCount: 1 },
  ]), updateCourse)
     router.patch('/unpublish/:id',protect,unPublishCourse)
     router.get('/instructor/my-courses',protect,getInstructorCourse)
     router.get('/admin/all',protect,getAdminCourses)
    
module.exports=router