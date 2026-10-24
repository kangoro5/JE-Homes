const crypto = require('crypto');

const cookieName = 'je_admin_session';
const sessionLifetimeMs = 8 * 60 * 60 * 1000;

function safeEqual(left, right) {
  const leftHash = crypto.createHash('sha256').update(String(left)).digest();
  const rightHash = crypto.createHash('sha256').update(String(right)).digest();
  return crypto.timingSafeEqual(leftHash, rightHash);
}

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) return null;
  return secret;
}

function sign(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function createSessionToken(secret) {
  const payload = Buffer.from(JSON.stringify({
    expiresAt: Date.now() + sessionLifetimeMs,
    nonce: crypto.randomBytes(16).toString('base64url')
  })).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

function getCookie(req) {
  const cookies = req.headers.cookie || '';
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

function hasValidSession(req) {
  const secret = getSessionSecret();
  if (!secret) return false;

  let token;
  try {
    token = getCookie(req);
  } catch {
    return false;
  }
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra !== undefined) return false;

  const expected = Buffer.from(sign(payload, secret), 'base64url');
  const provided = Buffer.from(signature, 'base64url');
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    return false;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Number.isFinite(session.expiresAt) && session.expiresAt > Date.now();
  } catch {
    return false;
  }
}

function setSessionCookie(res, token, secure) {
  const options = [
    `${cookieName}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${Math.floor(sessionLifetimeMs / 1000)}`,
    'HttpOnly',
    'SameSite=Strict'
  ];
  if (secure) options.push('Secure');
  res.set('Set-Cookie', options.join('; '));
}

function clearSessionCookie(res, secure) {
  const options = [`${cookieName}=`, 'Path=/', 'Max-Age=0', 'HttpOnly', 'SameSite=Strict'];
  if (secure) options.push('Secure');
  res.set('Set-Cookie', options.join('; '));
}

function requireAdmin(req, res, next) {
  if (hasValidSession(req)) return next();

  if (req.originalUrl.split('?')[0].startsWith('/admin')) {
    return res.redirect(`/admin/login?next=${encodeURIComponent(req.originalUrl)}`);
  }
  return res.status(401).json({ success: false, message: 'Admin login required.' });
}

function login(req, res) {
  const { username, password } = req.body || {};
  const configuredUsername = process.env.ADMIN_USERNAME;
  const configuredPassword = process.env.ADMIN_PASSWORD;
  const secret = getSessionSecret();

  if (!configuredUsername || !configuredPassword || !secret) {
    return res.status(503).json({ success: false, message: 'Admin access is not configured.' });
  }

  const valid = typeof username === 'string' && typeof password === 'string'
    && safeEqual(username, configuredUsername)
    && safeEqual(password, configuredPassword);
  if (!valid) {
    return res.status(401).json({ success: false, message: 'Incorrect username or password.' });
  }

  setSessionCookie(res, createSessionToken(secret), process.env.NODE_ENV === 'production');
  return res.json({ success: true });
}

function logout(req, res) {
  clearSessionCookie(res, process.env.NODE_ENV === 'production');
  return res.json({ success: true });
}

module.exports = { hasValidSession, login, logout, requireAdmin };