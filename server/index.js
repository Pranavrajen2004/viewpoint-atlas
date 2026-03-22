const express = require('express');
const cors    = require('cors');
const session = require('express-session');
const path    = require('path');

const newsRoutes    = require('./routes/news');
const profileRoutes = require('./routes/profile');
const injectRoutes  = require('./routes/inject');
const authRoutes    = require('./routes/auth');
const sourcesRoutes = require('./routes/sources');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(session({
  secret: 'va-demo-secret-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000, sameSite: 'lax' }
}));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/news',    newsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/inject',  injectRoutes);
app.use('/api/sources', sourcesRoutes);

// ── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', service: 'Viewpoint Atlas API', ts: Date.now() })
);

// ── Static (local dev only) ───────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, '..', 'index.html')));

// ── 404 (API routes only reach here) ─────────────────────────────────────────
// app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Start (local dev) / Export (Vercel serverless) ───────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n  Viewpoint Atlas API`);
    console.log(`  Running on http://localhost:${PORT}`);
    console.log(`  Health: http://localhost:${PORT}/api/health\n`);
  });
}

module.exports = app;
