
const ApiError = require('../utils/apiError.js');
const ApiResponse = require('../utils/apiResponse.js');
const asyncHandler = require('../middleware/asyncHandler.js');
const db = require('../models');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { Op } = require("sequelize");
const StripeService = require("../service/stripeService");

const getPagination = (page = 1, limit = 10) => {
  const parsedPage = parseInt(page, 10);
  const parsedLimit = parseInt(limit, 10);
  
  const validPage = parsedPage > 0 ? parsedPage : 1;
  const validLimit = parsedLimit > 0 && parsedLimit <= 100 ? parsedLimit : 10;
  
  const offset = (validPage - 1) * validLimit;
  
  return { offset, limit: validLimit };
};
// FIX 4: Removed unused imports: slugify, { where } from sequelize
const createCheckoutSession = asyncHandler(async (req, res) => {
  const session = await StripeService.createCheckoutSession(req.body);

  return res.json({
    success: true,
    url: session.url
  });
});
const preventDuplicatePurchase = async (courseId, userId) => {
  const existingPayment = await db.Payment.findOne({
    where: {
      userId,
      courseId,
      status: { [Op.in]: ["completed", "pending"] }
    }
  });

  return !!existingPayment;
};

const verifyStripeWebhook = (payload, signature) => {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
};

const createEnrollmentAfterPayment = async (courseId, userId, paymentId) => {
  const existingEnrollment = await db.Enrollment.findOne({
    where: { courseId, userId }
  });

  if (existingEnrollment) {
    return existingEnrollment;
  }

  const enrollment = await db.Enrollment.create({
    userId,
    courseId,
    paymentId,
    status: "active",
    progress: 0,
    enrolledAt: new Date(),
    lastAccessedAt: new Date(),
    certificateIssued: false
  });

  const totalStudents = await db.Enrollment.count({
    where: {
      courseId,
      status: { [Op.in]: ["completed", "active"] }
    }
  });

  await db.Course.update(
    { totalStudents },
    { where: { id: courseId } }
  );

  return enrollment;
};

const generateInvoiceUrl = (transactionId) => {
  return `https://dashboard.stripe.com/invoices/${transactionId}`;
};

const createPaymentIntent = asyncHandler(async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.user.id;

    if (!courseId)
      throw new ApiError(400, "Course ID is required");

    const course = await db.Course.findOne({
      where: {
        id: courseId,
        isPublished: true
      }
    });

    if (!course)
      throw new ApiError(400, "Course not found or not published");

    if (course.price <= 0 || course.isFree)
      throw new ApiError(400, "This course is free");

    const alreadyPurchased = await preventDuplicatePurchase(courseId, userId);

    if (alreadyPurchased)
      throw new ApiError(400, "Already purchased or pending payment exists");

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(course.price * 100),
      currency: course.currency || "usd",
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never"
      },
      metadata: {
        courseId: String(courseId),
        userId: String(userId),
        courseTitle: course.title
      }
    });

    const payment = await db.Payment.create({
      transactionId: paymentIntent.id,
      amount: course.price,
      currency: course.currency || "usd",
      status: "pending",
      paymentMethod: "credit_card",
      paymentDetails: {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret
      },
      userId,
      courseId
    });
    console.log("💾 Saving Payment:", paymentIntent.id);

    return res.status(201).json(
      new ApiResponse(201, {
        message: "Payment intent created successfully",
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          paymentId: payment.id,
          amount: payment.amount,
          currency: payment.currency
        }
      })
    );
    console.log("BODY:", req.body);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

const stripeWebhookHandler = async (req, res) => {
  const signature = req.headers["stripe-signature"];

  let event;

  try {
    event = StripeService.verifyWebhook(
      req.body,
      signature
    );
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: "Invalid webhook signature",
    });
  }

  console.log("🔥 EVENT:", event.type);

  try {
    switch (event.type) {

      // =========================
      // PAYMENT SUCCESS
      // =========================
      case "payment_intent.succeeded":
        await handlePaymentSuccess(event.data.object);
        break;

      // =========================
      // PAYMENT FAILED
      // =========================
      case "payment_intent.payment_failed":
        await handlePaymentFailed(event.data.object);
        break;

      // =========================
      // REFUND
      // =========================
      case "charge.refunded":
        await handleRefund(event.data.object);
        break;

      default:
        console.log("Ignored event:", event.type);
    }
    console.log("👉 WEBHOOK HIT");

    res.json({ received: true });

  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ success: false });
  }
};
const handlePaymentSuccess = async (paymentIntent) => {
  const { id, metadata, amount, currency } = paymentIntent;

  let payment = await db.Payment.findOne({
    where: {
      transactionId: id,
      courseId: Number(metadata?.courseId),
      userId: Number(metadata?.userId)
    }
  });

  if (!payment) {
    console.log("⚠️ Payment not found, creating new");

    payment = await db.Payment.create({
      transactionId: id,
      amount: amount / 100,
      currency,
      status: "pending",
      paymentMethod: "card",
      userId: Number(metadata?.userId),
      courseId: Number(metadata?.courseId),
    });
  }

  if (payment.status === "completed") return;

  payment.status = "completed";
  payment.paidAt = new Date();
  await payment.save();

  console.log("✅ Payment Completed:", id);
};
// const handlePaymentFailed = async (paymentIntent) => {
//   const payment = await db.Payment.findOne({
//     where: { transactionId: paymentIntent.id },
//   });

//   if (!payment) {
//     console.error("Payment not found:", paymentIntent.id);
//     return;
//   }

//   payment.status = "failed";
//   payment.failureReason =
//     paymentIntent.last_payment_error?.message || "Payment failed";

//   await payment.save();

//   console.log("❌ Payment failed handled");
// };

const handleRefund = async (charge) => {
  const paymentIntentId = charge.payment_intent;

  const payment = await db.Payment.findOne({
    where: { transactionId: paymentIntentId },
  });

  if (!payment) {
    console.error("Payment not found for refund:", paymentIntentId);
    return;
  }

  payment.status = "refunded";
  payment.refundedAt = new Date();

  await payment.save();

  console.log("💸 Refund processed");
};

const handlePaymentIntentCanceled = async (paymentIntent) => {
  const transactionId = paymentIntent.id;

  const payment = await db.Payment.findOne({
    where: { transactionId }
  });

  if (!payment) {
    console.error(`Payment not found for transaction: ${transactionId}`);
    return;
  }

  payment.status = "cancelled";
  await payment.save();

  console.log(`Payment cancelled for transaction: ${transactionId}`);
};
const handlePaymentFailed = async (paymentIntent) => {
  const payment = await db.Payment.findOne({
    where: { transactionId: paymentIntent.id }
  });

  if (!payment) return;

  payment.status = "failed";
  payment.failureReason =
    paymentIntent.last_payment_error?.message || "Payment failed";

  await payment.save();

  console.log("❌ Payment Failed:", paymentIntent.id);
};
// const handleRefund = async (charge) => {
//   const payment = await db.Payment.findOne({
//     where: { transactionId: charge.payment_intent }
//   });

//   if (!payment) return;

//   payment.status = "refunded";
//   payment.refundedAt = new Date();

//   await payment.save();

//   console.log("💸 Refund processed");
// };
//only logged in users can access
const getMyPayments=asyncHandler(async (req,res) => {
  try {
    const {page,limit,status}=req.query;
    const {offset,limit:parsedLimit}=getPagination(page,limit)
    const userId=req.user.id;
    const where={userId}
    if(status && ['completed','pending','failed','cancelled','refunded'].includes(status)){
      where.status=status
    }

    const {count,rows:payments}=await db.Payment.findAndCountAll({
      includes:[
        {
          model:db.Course,
          as:"course",
          attributes:['level','slug','price','title']
        }
      ],
      order:[['createdAt','DESC']],
      offset,
      limit:parsedLimit,
      distinct:true
    })
    const totalSpends=payments.filter(p=>p.status==='completed').reduce((sum,p)=>sum+parseFloat(p.amount),0)
    const completedPayments=payments.filter(p=>p.status==="completed").length
    const pendingPayments=payments.filter(p=>p.status==="pending").length
    const totalPages=Math.ceil(count/parsedLimit)
    const currentPage=parseInt(page,10)||1;
       return res.status(200).json(
      new ApiResponse(200, {
        message: "Your courses fetched successfully",
        data: {
          payments,
          stats:{
            totalPayments:count,
            completedPayments,
            pendingPayments,
            totalSpends:totalSpends.toFixed(2)
          },
          pagination: {
            totalItems: count,
            totalPages,
            currentPage,
            itemsPerPage: parsedLimit,
            hasNextPage: currentPage < totalPages,
            hasPrevPage: currentPage > 1
          }
        }
      })
    );
    
  } catch (error) {
     return res.status(500).json({
      success: false,
      message: error.message
    });
  }
  
})
const getMyPaymentById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  console.log("Requested ID:", id);
  const userId = req.user.id;
  const isAdmin = req.user.role === "admin";

  // ✅ condition build karo
  const whereCondition = isAdmin
    ? { id }
    : { id, userId };

  const payment = await db.Payment.findOne({
    where: whereCondition,
    include: [
      {
        model: db.User,
        as: "user",
        attributes: ["id", "firstName", "email"]
      },
      {
        model: db.Course,
        as: "course",
        attributes: ["id", "title", "price"]
      }
    ]
  });
  console.log("DB Result:", payment);
  if (!payment) {
  throw new ApiError(404, "Payment not found");
}

if (!isAdmin && payment.userId !== userId) {
  throw new ApiError(403, "Not authorized");
}

  return res.status(200).json(
    new ApiResponse(200, {
      message: "Payment retrieved successfully",
      data: payment
    })
  );
});
module.exports = {
  createPaymentIntent,
  stripeWebhookHandler,
  createCheckoutSession,
  getMyPayments,
  getMyPaymentById
};