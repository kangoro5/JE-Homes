const mpesaConfig = {
  consumerKey: process.env.MPESA_CONSUMER_KEY,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET,
  shortCode: process.env.MPESA_SHORTCODE,
  passKey: process.env.MPESA_PASSKEY,
  callbackUrl: process.env.MPESA_CALLBACK_URL
};

function getMpesaConfig() {
  const required = {
    consumerKey: 'MPESA_CONSUMER_KEY',
    consumerSecret: 'MPESA_CONSUMER_SECRET',
    shortCode: 'MPESA_SHORTCODE',
    passKey: 'MPESA_PASSKEY',
    callbackUrl: 'MPESA_CALLBACK_URL'
  };
  const missing = Object.entries(required)
    .filter(([key]) => !mpesaConfig[key])
    .map(([, environmentName]) => environmentName);
  if (missing.length) {
    throw new Error(`M-Pesa is not configured. Missing: ${missing.join(', ')}`);
  }

  const environment = process.env.MPESA_ENV === 'production' ? 'production' : 'sandbox';
  const host = environment === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
  return { ...mpesaConfig, host };
}

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (/^07\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^01\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^254[17]\d{8}$/.test(digits)) return digits;
  return null;
}

async function getAccessToken(config) {
  const credentials = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');
  const response = await fetch(`${config.host}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` }
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) throw new Error(result.errorMessage || 'Could not authenticate with M-Pesa');
  return result.access_token;
}

async function startStkPush({ amount, phone, bookingID, description }) {
  const config = getMpesaConfig();
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) throw new Error('Enter a valid Kenyan M-Pesa number, for example 0712345678');

  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const password = Buffer.from(`${config.shortCode}${config.passKey}${timestamp}`).toString('base64');
  const token = await getAccessToken(config);
  const response = await fetch(`${config.host}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: config.shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.max(1, Math.round(Number(amount))),
      PartyA: normalizedPhone,
      PartyB: config.shortCode,
      PhoneNumber: normalizedPhone,
      CallBackURL: config.callbackUrl,
      AccountReference: `JE-${bookingID.slice(-8)}`,
      TransactionDesc: description || 'JE Homes booking'
    })
  });
  const result = await response.json();
  if (!response.ok || result.ResponseCode !== '0') throw new Error(result.errorMessage || result.ResponseDescription || 'M-Pesa payment request failed');
  return { ...result, phone: normalizedPhone };
}

module.exports = { normalizePhone, startStkPush };
