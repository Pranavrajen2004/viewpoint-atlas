/**
 * Sources Route — /api/sources
 *
 * Exposes the Viewpoint Atlas source genome database.
 *
 * GET /api/sources           — all sources (with optional filters)
 * GET /api/sources/:id       — single source genome card
 *
 * Query params for GET /api/sources:
 *   lean        'l' | 'c' | 'r'   — filter by ideological tendency
 *   country     ISO 3166-1 alpha-2 — filter by country
 *   minRel      float 1-5          — minimum reliability score
 *   topic       string             — filter to sources strong on this topic
 */

const router  = require('express').Router();
const { SOURCES, getSource } = require('../data/sources');

// ── GET /api/sources ──────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const { lean, country, minRel, topic } = req.query;

  let list = Object.entries(SOURCES).map(([id, s]) => ({ id, ...s }));

  if (lean)    list = list.filter(s => s.lean === lean);
  if (country) list = list.filter(s => s.country === country.toUpperCase());
  if (minRel)  list = list.filter(s => s.reliability >= parseFloat(minRel));
  if (topic)   list = list.filter(s => s.topicStrengths.some(t => t.toLowerCase().includes(topic.toLowerCase())));

  // Sort: reliability descending
  list.sort((a, b) => b.reliability - a.reliability);

  res.json({ count: list.length, sources: list });
});

// ── GET /api/sources/:id ──────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const source = SOURCES[req.params.id];
  if (!source) return res.status(404).json({ error: `Source "${req.params.id}" not found.` });
  res.json({ id: req.params.id, ...source });
});

module.exports = router;
