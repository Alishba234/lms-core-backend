const express=require('express')
const router=express.Router()
const {createPaymentIntent,createCheckoutSession,getMyPayments,getMyPaymentById}=require('../controllers/paymentController')
const {protect}=require('../middleware/authMiddleware')
router.get('/get/:id', protect,getMyPaymentById)
router.post('/create',protect,createPaymentIntent)
router.post("/checkout-session", createCheckoutSession);
router.get('/me', protect,getMyPayments)

//router.post('/webhook',stripeWebhookHandler)
module.exports=router