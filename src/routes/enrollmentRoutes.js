const express=require('express')
const router=express.Router()
const {
    enrollCourse,
    getMyEnrollments,
    getEnrollmentsById,
    dropCourse,
    getAllEnrollments,
    suspendeEnrollment,
    resumeEnrollment,
    deleteEnrollment, 
    markeAsCompleted,
    getCourseEnrollments
    }=require('../controllers/enrollmentController')
const {protect, admin}=require('../middleware/authMiddleware')
router.post('/create' ,protect,enrollCourse)
router.get('/my' ,protect,getMyEnrollments)
router.get('/:id' ,protect,getEnrollmentsById)
router.get('/my/:coursId' ,protect,getCourseEnrollments)
router.put('/mark/:id' ,protect,markeAsCompleted)
router.put('/drop/:id' ,protect,dropCourse)
router.delete('/delete/:id' ,protect,admin, deleteEnrollment)
router.put('/resume/:id' ,protect,admin, resumeEnrollment)
router.put('/suspend/:id' ,protect,admin, suspendeEnrollment)
router.get('/admin' ,protect,admin, getAllEnrollments)

module.exports=router