const Stripe = require('stripe');

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Card payments are not configured. Missing STRIPE_SECRET_KEY');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function getCheckoutUrls(request) {
  const frontendUrl = process.env.FRONTEND_URL?.split(',')[0].trim();
  const origin = process.env.PUBLIC_BASE_URL || frontendUrl || `${request.protocol}://${request.get('host')}`;
  return {
    success_url: `${origin}/?payment=success&booking={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?payment=cancelled`
  };
}

async function createCheckoutSession({ request, amount, bookingID, guestEmail, description }) {
  const stripe = getStripe();
  const currency = (process.env.STRIPE_CURRENCY || 'kes').toLowerCase();
  const urls = getCheckoutUrls(request);

  return stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: guestEmail || undefined,
    line_items: [{
      quantity: 1,
      price_data: {
        currency,
        unit_amount: Math.round(Number(amount) * 100),
        product_data: { name: description || 'JE Homes booking' }
      }
    }],
    metadata: { bookingID },
    ...urls
  });
}

function constructWebhookEvent(payload, signature) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('Card payments are not configured. Missing STRIPE_WEBHOOK_SECRET');
  }
  return getStripe().webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
}

module.exports = { createCheckoutSession, constructWebhookEvent };
