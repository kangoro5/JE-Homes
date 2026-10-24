const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db');
const { startStkPush } = require('../mpesa');
const { createCheckoutSession, constructWebhookEvent } = require('../stripe');

const paymentMethods = new Set(['mpesa', 'card', 'pay_at_property']);

const checkBookingDates = (req, res, next) => {
  const { checkIn, checkOut } = req.body || {};
  const start = new Date(checkIn);
  const end = new Date(checkOut);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    return res.status(400).json({ success: false, message: 'Invalid date range' });
  }

  next();
};

// POST /process-booking
router.post('/process-booking', checkBookingDates, async (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.roomID || !data.checkIn || !data.checkOut || !paymentMethods.has(data.paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Missing booking data' });
    }
    if ((data.paymentMethod === 'mpesa' || data.paymentMethod === 'card') && (!Number.isFinite(Number(data.amount)) || Number(data.amount) < 1)) {
      return res.status(400).json({ success: false, message: 'A valid booking amount is required for payment' });
    }

    const bookingID = `bk_${uuidv4()}`;
    let payment = { status: data.paymentMethod === 'pay_at_property' ? 'pay_on_arrival' : 'pending' };
    if (data.paymentMethod === 'mpesa') {
      const stk = await startStkPush({ amount: data.amount, phone: data.mpesaPhone, bookingID });
      payment = {
        status: 'prompt_sent',
        phone: stk.phone,
        merchantRequestID: stk.MerchantRequestID,
        checkoutRequestID: stk.CheckoutRequestID,
        customerMessage: stk.CustomerMessage
      };
    }
    if (data.paymentMethod === 'card') {
      const session = await createCheckoutSession({
        request: req,
        amount: data.amount,
        bookingID,
        guestEmail: data.guestEmail,
        description: `JE Homes stay: ${data.roomID}`
      });
      payment = { status: 'checkout_created', checkoutSessionID: session.id, checkoutUrl: session.url };
    }

    const db = getDB();
    const bookingDoc = { id: bookingID, ...data, payment, createdAt: new Date().toISOString() };
    await db.collection('bookings').insertOne(bookingDoc);

    const response = { success: true, bookingID, paymentStatus: payment.status, customerMessage: payment.customerMessage, checkoutUrl: payment.checkoutUrl };
    res.json(response);
  } catch (err) {
    console.error(err);
    const unavailable = err.message.startsWith('M-Pesa') || err.message.startsWith('Enter a valid') || err.message.startsWith('Card payments');
    res.status(unavailable ? 503 : 500).json({ success: false, message: err.message });
  }
});

router.post('/payments/stripe/webhook', async (req, res) => {
  try {
    const event = constructWebhookEvent(req.body, req.headers['stripe-signature']);
    const session = event.data.object;
    const bookingID = session.metadata?.bookingID;
    if (bookingID && ['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
      await getDB().collection('bookings').updateOne({ id: bookingID }, { $set: { 'payment.status': 'paid', 'payment.paidAt': new Date().toISOString(), updatedAt: new Date().toISOString() } });
    }
    if (bookingID && event.type === 'checkout.session.async_payment_failed') {
      await getDB().collection('bookings').updateOne({ id: bookingID }, { $set: { 'payment.status': 'failed', updatedAt: new Date().toISOString() } });
    }
    res.json({ received: true });
  } catch (err) {
    console.error(err);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

router.post('/payments/mpesa/callback', async (req, res) => {
  try {
    const callback = req.body?.Body?.stkCallback;
    if (!callback) return res.status(400).json({ ResultCode: 1, ResultDesc: 'Invalid callback' });

    const payment = { status: callback.ResultCode === 0 ? 'paid' : 'failed', resultCode: callback.ResultCode, resultDescription: callback.ResultDesc };
    await getDB().collection('bookings').updateOne(
      { 'payment.checkoutRequestID': callback.CheckoutRequestID },
      { $set: { payment, updatedAt: new Date().toISOString() } }
    );
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ResultCode: 1, ResultDesc: 'Callback processing failed' });
  }
});

// POST /send-confirmation
router.post('/send-confirmation', async (req, res) => {
  try {
    const { bookingID } = req.body || {};
    if (!bookingID) return res.status(400).json({ success: false, message: 'Missing bookingID' });

    const db = getDB();
    const booking = await db.collection('bookings').findOne({ id: bookingID });
    if (!booking) return res.status(400).json({ success: false, message: 'Invalid bookingID' });

    // In real app: send email/SMS. Here, mark confirmed
    await db.collection('bookings').updateOne({ id: bookingID }, { $set: { confirmedAt: new Date().toISOString() } });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /bookings
router.get('/bookings', async (req, res) => {
  try {
    const db = getDB();
    const list = await db.collection('bookings').find().toArray();
    res.json({ success: true, bookings: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;