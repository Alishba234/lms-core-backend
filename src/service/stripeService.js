const stripe = require('../config/stripe')

class StripeService {

  // =========================
  // CREATE PAYMENT INTENT
  // =========================
  static async createPaymentIntent({ amount, currency, metadata }) {
    return await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency || "usd",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata,
    });
  }

  // =========================
  // CREATE CHECKOUT SESSION
  // =========================
  static async createCheckoutSession({ line_items, success_url, cancel_url }) {
    return await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items,
        success_url: success_url || "http://localhost:5173/success",
    cancel_url: cancel_url || "http://localhost:5173/cancel",
      
    });
  }

  // =========================
  // VERIFY WEBHOOK
  // =========================
  static verifyWebhook(payload, signature) {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  }
}

module.exports = StripeService;