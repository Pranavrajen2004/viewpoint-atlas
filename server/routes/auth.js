/**
 * Auth Routes — /api/auth
 *
 * Demo-grade auth: users stored in an in-memory Map.
 * Passwords are base64-encoded (NOT for production — demo only).
 * Sessions managed via express-session.
 *
 * POST /api/auth/signup   — register a new account
 * POST /api/auth/login    — log in and start session
 * POST /api/auth/logout   — destroy session
 * GET  /api/auth/me       — return current session user (or 401)
 */

const router = require('express').Router();

// In-memory user store (keyed by lowercase username)
// Structure: { username, email, passwordB64, createdAt }
const USERS = new Map();

// Seed a demo account so presenters can always log in
USERS.set('demo', {
  username: 'demo',
  email: 'demo@viewpointatlas.com',
  passwordB64: Buffer.from('demo1234').toString('base64'),
  createdAt: Date.now()
});

// ── POST /api/auth/signup ────────────────────────────────────────────────────
router.post('/signup', (req, res) => {
  const { username, email, password } = req.body;

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
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: 'username and password are required.' });

  const key  = username.toLowerCase();
  const user = USERS.get(key);

  if (!user || Buffer.from(password).toString('base64') !== user.passwordB64)
    return res.status(401).json({ error: 'Invalid username or password.' });

  req.session.user = { username: user.username, email: user.email };
  res.json({ message: 'Logged in.', user: { username: user.username, email: user.email } });
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
