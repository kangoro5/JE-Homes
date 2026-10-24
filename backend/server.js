require('dotenv').config();

const express = require('express');
const { connectDB, closeDB } = require('./db');
const bookingRoutes = require('./routes/bookings');
const { hasValidSession, login, logout, requireAdmin } = require('./admin-auth');

const app = express();
const port = Number(process.env.PORT) || 4000;
const frontendOrigins = new Set(
  (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.use((req, res, nextMiddleware) => {
  const origin = req.get('Origin');
  if (origin && !frontendOrigins.has(origin)) {
    return res.status(403).json({ success: false, message: 'Origin is not allowed.' });
  }
  if (origin) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    return res.sendStatus(204);
  }
  return nextMiddleware();
});
app.use('/payments/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

app.post('/api/admin/login', login);
app.get('/api/admin/session', (req, res) => res.json({ authenticated: hasValidSession(req) }));
app.post('/api/admin/logout', logout);

app.use(['/bookings', '/send-confirmation'], requireAdmin);
app.use('/', bookingRoutes);

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

async function start() {
  await connectDB();
  const server = app.listen(port, () => {
    console.log(`JE Homes API is running at http://localhost:${port}`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await closeDB();
      process.exit(0);
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

start().catch((error) => {
  console.error('Could not start JE Homes:', error.message);
  process.exit(1);
});
