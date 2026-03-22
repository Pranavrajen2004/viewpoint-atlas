/**
 * Inject Route — /api/inject
 *
 * Accepts a URL, infers source profile from its domain, generates mock
 * analysis (frames, tone, lean, reliability, why-shown), and returns a
 * fully enriched article object ready to be displayed in the feed.
 *
 * POST /api/inject
 * Body: { url: string, topic?: string, userProfile?: object }
 *
 * Response: enrichedArticle (same shape as /api/news/feed articles)
 *
 * This endpoint does NOT fetch the article content — it works purely from
 * the URL's domain and path structure, which is sufficient for a demo.
 * In production you would fetch + parse the HTML to extract real metadata.
 */

const router = require('express').Router();
const { getSourceByDomain }    = require('../data/sources');
const { detectFrames, detectEmotionalTone, generateWhyShown } = require('../data/analysis');

// ── POST /api/inject ──────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { url, topic = 'general', userProfile = {} } = req.body;

  if (!url) return res.status(400).json({ error: 'url is required.' });

  let parsed;
  try {
    parsed = new URL(url.startsWith('http') ? url : 'https://' + url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL.' });
  }

  const domain  = parsed.hostname.replace(/^www\./, '');
  const source  = getSourceByDomain(domain);

  // Synthesise article metadata from URL structure
  // Slug-to-title: take last path segment, replace dashes/underscores with spaces
  const slug      = parsed.pathname.split('/').filter(Boolean).pop() || '';
  const titleHint = slug
    .replace(/[-_]/g, ' ')
    .replace(/\.\w+$/, '')        // strip extension
    .replace(/\b\w/g, c => c.toUpperCase()) || `Article from ${source.name}`;

  // Build a synthetic article for analysis
  const synthetic = {
    title:       titleHint,
    description: `Injected article from ${source.name}. Bias and frame analysis based on outlet profile.`,
    url,
    source:      { id: source.id, name: source.name },
    publishedAt: new Date().toISOString(),
    urlToImage:  null,
    _topic:      topic
  };

  const frames = detectFrames(synthetic);
  const tone   = detectEmotionalTone(synthetic);
  const why    = generateWhyShown(
    { ...synthetic, _frames: frames },
    source,
    userProfile,
    'my'
  );

  res.json({
    // ── Identity ──
    id:          url,
    url,
    injected:    true,
    // ── Content ──
    title:       titleHint,
    description: synthetic.description,
    content:     null,
    imageUrl:    null,
    publishedAt: synthetic.publishedAt,
    // ── Source ──
    source: {
      id:          source.id,
      name:        source.name,
      lean:        source.lean,
      reliability: source.reliability,
      country:     source.country,
      ownership:   source.ownership,
      audience:    source.audience,
      topicStrengths: source.topicStrengths,
      notes:       source.notes
    },
    // ── Analysis ──
    frames,
    tone,
    topic,
    // ── Personalisation ──
    whyShown: why,
    feedMode: 'injected',
    // ── Injection metadata ──
    injectionMeta: {
      domain,
      detectedAt:  new Date().toISOString(),
      note:        source.id
        ? `Source matched to database entry "${source.id}".`
        : `Domain "${domain}" not in database — using neutral defaults.`
    }
  });
});

module.exports = router;
