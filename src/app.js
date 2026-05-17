require ('dotenv').config()
const express=require('express')
const ConnectDB=require('./config/database')
const cors=require('cors')
const globalErrorHandler=require('./utils/globalErrorHandler')

const userRoutes=require('./routes/userRoutes')
const categoryRoutes=require('./routes/categoryRoutes')
const courseRoutes=require('./routes/courseRoutes')
const sectionRoutes=require('./routes/sectionRoutes')
const lectureRoutes=require('./routes/lectureRoutes')
const reviewRoutes=require('./routes/reviewRoutes')
const enrollmentRoutes=require('./routes/enrollmentRoutes')
const paymentRoutes=require('./routes/paymentRoutes')
const assigmentRoutes=require('./routes/assigmentRoutes')
const {stripeWebhookHandler}=require('./controllers/paymentController')

const app=express()
const allowedOrigins=['http://localhost:5173']
app.use(cors({origin:allowedOrigins,credentials:true}));
app.post(
  '/api/v1/payment/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhookHandler
);
// 🔥 THEN normal parsing
app.use(express.json());
app.get("/success",(req,res)=>{
    res.send('Payment Recieved')
})
//routes
app.use('/api/v1/user',userRoutes)
app.use('/api/v1/category',categoryRoutes)
app.use('/api/v1/course',courseRoutes)
app.use('/api/v1/section',sectionRoutes)
app.use('/api/v1/lecture',lectureRoutes)
app.use('/api/v1/review',reviewRoutes)
app.use('/api/v1/enrollment',enrollmentRoutes)
app.use('/api/v1/payment',paymentRoutes)
app.use('/api/v1/assigment',assigmentRoutes)
// app.use('/api/auth',authRoutes)
// // ✅ ADD THE REDIRECT HERE
// app.get('/reset-password/:token', (req, res) => {
//   res.redirect(`http://localhost:5173/reset-password/${req.params.token}`);
// });

ConnectDB()
app.use(globalErrorHandler)
app.listen(4000,()=>{
    console.log("server is running on port 4000");
    
})