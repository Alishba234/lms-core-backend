const express=require('express')
const router=express.Router()
const {createAssigment}=require('../controllers/assigmentController')
router.post('/create',createAssigment)
module.exports=router