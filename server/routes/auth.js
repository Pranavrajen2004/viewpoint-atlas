/**
 * Auth Routes — /api/auth
 *
 * Demo-grade auth: users stored in an in-memory Map.
 * Passwords are base64-encoded (NOT for production — demo only).
 * Sessions managed via express-session.
 * CAPTCHA: Cloudflare Turnstile (test keys — always pass, no warning banners).
 *
 * POST /api/auth/signup   — register a new account
 * POST /api/auth/login    — log in and start session
 * POST /api/auth/logout   — destroy session
 * GET  /api/auth/me       — return current session user (or 401)
 */

const router = require('express').Router();
const fetch  = require('node-fetch');

// In-memory user store (keyed by lowercase username)
// Structure: { username, email, passwordB64, createdAt }
const USERS = new Map();

// ── Cloudflare Turnstile verification ────────────────────────────────────────
// Uses Cloudflare's siteverify API.
// Test secret "1x0000000000000000000000000000000AA" always returns success=true
// for the test sitekey "1x00000000000000000000AA" — no warning banners shown.
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET;

async function verifyCaptcha(token) {
  if (!TURNSTILE_SECRET) return true; // Secret not configured — allow through
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret: TURNSTILE_SECRET, response: token });
    const res  = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });
    const data = await res.json();
    return data.success === true;
  } catch (e) {
    return true; // If Turnstile API is unreachable, allow through
  }
}

// Seed a demo account so presenters can always log in
USERS.set('demo', {
  username: 'demo',
  email: 'demo@viewpointatlas.com',
  passwordB64: Buffer.from('demo1234').toString('base64'),
  createdAt: Date.now()
});

// ── POST /api/auth/signup ────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  const { username, email, password, captchaToken } = req.body;

  // Server-side CAPTCHA verification
  const captchaOk = await verifyCaptcha(captchaToken);
  if (!captchaOk)
    return res.status(400).json({ error: 'CAPTCHA verification failed. Please try again.' });

  if (!username || !email || !password)
    return res.status(400).json({ error: 'username, email and password are required.' });

  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Invalid email address.' });

  const key = username.toLowerCase();
  if (USERS.has(key))
    return res.status(409).json({ error: 'Username already taken.' });

  const user = {
    username,
    email,
    passwordB64: Buffer.from(password).toString('base64'),
    createdAt: Date.now()
  };
  USERS.set(key, user);

  req.session.user = { username, email };
  res.status(201).json({ message: 'Account created.', user: { username, email } });
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { username, password, captchaToken } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: 'username and password are required.' });

  // Server-side CAPTCHA verification
  const captchaOk = await verifyCaptcha(captchaToken);
  if (!captchaOk)
    return res.status(400).json({ error: 'CAPTCHA verification failed. Please try again.' });

  const key  = username.toLowerCase();
  const user = USERS.get(key);

  if (!user || Buffer.from(password).toString('base64') !== user.passwordB64)
    return res.status(401).json({ error: 'Invalid username or password.' });

  req.session.user = { username: user.username, email: user.email };
  res.json({ message: 'Logged in.', user: { username: user.username, email: user.email } });
});

// ── PUT /api/auth/update ─────────────────────────────────────────────────────
/**
 * Update the authenticated user's email and/or password.
 * Body: { email?, newPassword?, currentPassword (required) }
 */
router.put('/update', (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ error: 'Not authenticated.' });

  const { email, newPassword, currentPassword } = req.body;
  if (!currentPassword)
    return res.status(400).json({ error: 'currentPassword is required to update your profile.' });

  const key  = req.session.user.username.toLowerCase();
  const user = USERS.get(key);
  if (!user)
    return res.status(404).json({ error: 'User not found.' });

  // Verify current password
  if (Buffer.from(currentPassword).toString('base64') !== user.passwordB64)
    return res.status(401).json({ error: 'Current password is incorrect.' });

  // Validate new values
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Invalid email address.' });

  if (newPassword && newPassword.length < 6)
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });

  // Apply updates
  if (email)       user.email       = email;
  if (newPassword) user.passwordB64 = Buffer.from(newPassword).toString('base64');
  USERS.set(key, user);

  req.session.user = { username: user.username, email: user.email };
  res.json({ message: 'Profile updated.', user: { username: user.username, email: user.email } });
});

// ── DELETE /api/auth/account ─────────────────────────────────────────────────
/**
 * Permanently delete the authenticated user's account.
 * Body: { password (required for confirmation) }
 */
router.delete('/account', (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ error: 'Not authenticated.' });

  const { password } = req.body;
  if (!password)
    return res.status(400).json({ error: 'password is required to delete your account.' });

  const key  = req.session.user.username.toLowerCase();
  const user = USERS.get(key);
  if (!user)
    return res.status(404).json({ error: 'User not found.' });

  if (Buffer.from(password).toString('base64') !== user.passwordB64)
    return res.status(401).json({ error: 'Incorrect password.' });

  USERS.delete(key);
  req.session.destroy(() => {
    res.json({ message: 'Account deleted successfully.' });
  });
});

// ── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Could not end session.' });
    res.json({ message: 'Logged out.' });
  });
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ error: 'Not authenticated.' });
  res.json({ user: req.session.user });
});

module.exports = router;
