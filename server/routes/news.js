/**
 * News Routes — /api/news
 *
 * Proxies NewsAPI, enriches every article with bias label, reliability,
 * detected frames, emotional tone, and a "why shown" explanation.
 *
 * GET /api/news/feed     — personalized / mode-filtered feed
 * GET /api/news/topic/:topic — left/center/right breakdown for a topic
 * GET /api/news/search   — free-text article search
 */

const router = require('express').Router();
const fetch  = require('node-fetch');

const { getSource }          = require('../data/sources');
const { detectFrames, detectEmotionalTone, generateWhyShown } = require('../data/analysis');

// Prefer the Vercel environment variable; fall back to the bundled dev key
const NEWS_API_KEY = process.env.NEWS_API_KEY || 'f8af41eaeaa84575b02930eb91348404';
const NEWS_API_BASE = 'https://newsapi.org/v2';

// Topic → NewsAPI search query mapping
const TOPIC_QUERIES = {
  'economy':        'economy OR inflation OR recession OR GDP OR unemployment',
  'foreign-policy': 'foreign policy OR diplomacy OR geopolitics OR sanctions OR NATO',
  'tech-regulation':'AI regulation OR antitrust OR Big Tech OR data privacy OR platform regulation',
  'environment':    'climate change OR emissions OR renewable energy OR carbon OR wildfire',
  'gender':         'gender equality OR abortion OR reproductive rights OR transgender OR feminism',
  'immigration':    'immigration OR border OR migrants OR asylum OR deportation',
  'elections':      'election OR voting OR ballot OR democracy OR campaign',
  'health':         'healthcare OR pandemic OR vaccine OR hospital OR mental health',
  'media':          'media bias OR disinformation OR press freedom OR journalism OR fake news',
  'finance':        'stock market OR Federal Reserve OR interest rates OR banking OR cryptocurrency'
};

// Feed mode configurations
const FEED_MODES = {
  'my':          { label: 'My Feed',           sources: null,  leanFilter: null   },
  'balanced':    { label: 'Balanced Feed',      sources: null,  leanFilter: ['l','c','r'] },
  'bubble':      { label: 'Outside My Bubble',  sources: null,  leanFilter: null   },
  'reliability': { label: 'High Reliability',   minRel: 4.3,   leanFilter: null   },
  'global-south':{ label: 'Global South Lens',  sources: ['al-jazeera-english','deutsche-welle','the-hindu'], leanFilter: null }
};

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchFromNewsAPI(endpoint, params = {}) {
  const url = new URL(`${NEWS_API_BASE}/${endpoint}`);
  url.searchParams.set('apiKey', NEWS_API_KEY);
  Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`NewsAPI error: ${res.status}`);
  return res.json();
}

/**
 * Enrich a raw NewsAPI article with Viewpoint Atlas analysis.
 * topic and mode are passed through for why-shown generation.
 */
function enrichArticle(raw, topic = 'general', mode = 'my', userProfile = {}) {
  const src    = getSource(raw.source?.id);
  const frames = detectFrames(raw);
  const tone   = detectEmotionalTone(raw);
  const why    = generateWhyShown({ ...raw, _topic: topic, _frames: frames }, src, userProfile, mode);

  return {
    // ── Identity ──
    id:          raw.url,          // URL as stable ID
    url:         raw.url,
    // ── Content ──
    title:       raw.title,
    description: raw.description,
    content:     raw.content,
    imageUrl:    raw.urlToImage,
    publishedAt: raw.publishedAt,
    // ── Source ──
    source: {
      id:          raw.source?.id || null,
      name:        raw.source?.name || src.name,
      lean:        src.lean,           // 'l' | 'c' | 'r'
      reliability: src.reliability,    // 1.0 – 5.0
      country:     src.country,
      ownership:   src.ownership,
      audience:    src.audience,
      topicStrengths: src.topicStrengths,
      notes:       src.notes
    },
    // ── Analysis ──
    frames,         // e.g. ['Economic Cost', 'Corporate Power']
    tone,           // { dominant: 'outrage', scores: { outrage: 40, … } }
    topic,
    // ── Personalisation ──
    whyShown: why,
    feedMode: mode
  };
}

/**
 * Apply slider-based re-ranking.
 *   novelty      0-100  — higher = prefer less-familiar sources
 *   spread       0-100  — higher = enforce lean diversity
 *   reliability  0-100  — acts as a minimum threshold (mapped to 1-5 scale)
 *   emotional    0-100  — higher = suppress high emotional-tone articles
 */
function applySliders(articles, sliders = {}) {
  const { novelty = 50, spread = 50, reliability = 50, emotional = 50 } = sliders;

  const minRel = 1 + (reliability / 100) * 4; // maps 0-100 → 1.0-5.0

  let filtered = articles.filter(a => a.source.reliability >= minRel);

  // Suppress high-emotional if slider is low
  if (emotional < 40) {
    filtered = filtered.filter(a => {
      const topScore = Math.max(...Object.values(a.tone.scores));
      return topScore < 60; // drop articles with very dominant emotional signal
    });
  }

  // Enforce lean spread if slider is high
  if (spread > 70 && filtered.length >= 6) {
    const buckets = { l: [], c: [], r: [] };
    filtered.forEach(a => buckets[a.source.lean].push(a));
    // Round-robin from all three buckets
    const result = [];
    const max = Math.max(...Object.values(buckets).map(b => b.length));
    for (let i = 0; i < max; i++) {
      ['l', 'c', 'r'].forEach(lean => {
        if (buckets[lean][i]) result.push(buckets[lean][i]);
      });
    }
    filtered = result;
  }

  return filtered;
}

// ── GET /api/news/proxy ───────────────────────────────────────────────────────
/**
 * Transparent proxy to NewsAPI — lets the browser call this endpoint and
 * bypass the CORS restriction that NewsAPI enforces on non-localhost origins.
 * Query params:
 *   q         — search string
 *   pageSize  — max results (default 8, max 20)
 *   sortBy    — 'publishedAt' | 'relevancy' (default 'publishedAt')
 */
router.get('/proxy', async (req, res) => {
  try {
    const { q = 'world news', sortBy = 'publishedAt', userKey } = req.query;
    const pageSize = Math.min(parseInt(req.query.pageSize) || 8, 20);
    // Prefer the user's own key (forwarded from frontend localStorage) over the default
    const apiKey = (userKey && userKey.length > 10) ? userKey : NEWS_API_KEY;
    const url = new URL(`${NEWS_API_BASE}/everything`);
    url.searchParams.set('apiKey', apiKey);
    url.searchParams.set('q', q);
    url.searchParams.set('language', 'en');
    url.searchParams.set('sortBy', sortBy);
    url.searchParams.set('pageSize', String(pageSize));
    const upstream = await fetch(url.toString());
    const data = await upstream.json();
    if (!upstream.ok) {
      console.error('[/api/news/proxy] NewsAPI error:', data);
      return res.status(upstream.status).json(data);
    }
    res.json(data);
  } catch (err) {
    console.error('[/api/news/proxy]', err.message);
    res.status(502).json({ error: err.message });
  }
});

// ── GET /api/news/feed ────────────────────────────────────────────────────────
/**
 * Query params:
 *   mode        'my' | 'balanced' | 'bubble' | 'reliability' | 'global-south'  (default: 'my')
 *   topics      comma-separated list e.g. 'economy,environment'
 *   novelty     0-100 (default 50)
 *   spread      0-100 (default 50)
 *   reliability 0-100 (default 50)
 *   emotional   0-100 (default 50)
 *   pageSize    max articles to return (default 20, max 50)
 */
router.get('/feed', async (req, res) => {
  try {
    const mode      = FEED_MODES[req.query.mode] ? req.query.mode : 'my';
    const topics    = req.query.topics ? req.query.topics.split(',').map(t => t.trim()) : Object.keys(TOPIC_QUERIES);
    const pageSize  = Math.min(parseInt(req.query.pageSize) || 20, 50);
    const sliders   = {
      novelty:     parseInt(req.query.novelty)     || 50,
      spread:      parseInt(req.query.spread)      || 50,
      reliability: parseInt(req.query.reliability) || 50,
      emotional:   parseInt(req.query.emotional)   || 50
    };

    // Build a combined search query from selected topics
    const topicPick = topics.slice(0, 3); // NewsAPI free tier limits — pick top 3
    const query     = topicPick.map(t => TOPIC_QUERIES[t] || t).join(' OR ');

    const modeConfig = FEED_MODES[mode];

    // For global-south mode we restrict to specific sources
    const sourcesParam = modeConfig.sources ? modeConfig.sources.join(',') : undefined;

    const data = await fetchFromNewsAPI('everything', {
      q:        query,
      sources:  sourcesParam,
      language: 'en',
      sortBy:   'publishedAt',
      pageSize: Math.min(pageSize * 2, 100) // fetch extra to allow filtering headroom
    });

    let articles = (data.articles || [])
      .filter(a => a.title && a.url && !a.title.includes('[Removed]'))
      .map(a => enrichArticle(a, topicPick[0] || 'general', mode));

    // High-reliability mode: filter by source reliability
    if (mode === 'reliability') {
      articles = articles.filter(a => a.source.reliability >= (modeConfig.minRel || 4.3));
    }

    articles = applySliders(articles, sliders).slice(0, pageSize);

    res.json({
      mode,
      modeLabel: FEED_MODES[mode].label,
      count:     articles.length,
      sliders,
      articles
    });

  } catch (err) {
    console.error('[/api/news/feed]', err.message);
    res.status(502).json({ error: 'Failed to fetch news feed.', detail: err.message });
  }
});

// ── GET /api/news/topic/:topic ────────────────────────────────────────────────
/**
 * Returns articles for a topic broken into left / center / right columns.
 * Path param:  topic  — one of the TOPIC_QUERIES keys
 * Query param: pageSize  (default 15, max 30 per lean column = 45 total)
 *
 * Response:
 *   { topic, left: [...], center: [...], right: [...], frames: [...], timeline: [...] }
 */
router.get('/topic/:topic', async (req, res) => {
  try {
    const topic    = req.params.topic;
    const query    = TOPIC_QUERIES[topic] || topic;
    const colSize  = Math.min(parseInt(req.query.pageSize) || 5, 15);

    const data = await fetchFromNewsAPI('everything', {
      q:        query,
      language: 'en',
      sortBy:   'publishedAt',
      pageSize: 100
    });

    const enriched = (data.articles || [])
      .filter(a => a.title && a.url && !a.title.includes('[Removed]'))
      .map(a => enrichArticle(a, topic, 'my'));

    // Split into lean columns
    const columns = { left: [], center: [], right: [] };
    enriched.forEach(a => {
      const col = a.source.lean === 'l' ? 'left' : a.source.lean === 'r' ? 'right' : 'center';
      if (columns[col].length < colSize) columns[col].push(a);
    });

    // Aggregate all frames across articles
    const frameCounts = {};
    enriched.forEach(a => a.frames.forEach(f => {
      frameCounts[f] = (frameCounts[f] || 0) + 1;
    }));
    const topFrames = Object.entries(frameCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([frame, count]) => ({ frame, count }));

    // Simple timeline: group by date, pick headline
    const byDate = {};
    enriched.slice(0, 40).forEach(a => {
      const day = a.publishedAt ? a.publishedAt.slice(0, 10) : 'unknown';
      if (!byDate[day]) byDate[day] = [];
      byDate[day].push(a);
    });
    const timeline = Object.entries(byDate)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 7)
      .map(([date, arts]) => ({
        date,
        headline: arts[0].title,
        sourceCount: arts.length,
        frames: [...new Set(arts.flatMap(a => a.frames))].slice(0, 3)
      }));

    res.json({ topic, columns, topFrames, timeline, totalFetched: enriched.length });

  } catch (err) {
    console.error('[/api/news/topic]', err.message);
    res.status(502).json({ error: 'Failed to fetch topic articles.', detail: err.message });
  }
});

// ── GET /api/news/search ──────────────────────────────────────────────────────
/**
 * Free-text search across all sources.
 * Query params:
 *   q         — search string (required)
 *   pageSize  — max results (default 20)
 *
 * Response: { query, count, articles: [...enrichedArticle] }
 */
router.get('/search', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: 'q (search query) is required.' });

    const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 50);

    const data = await fetchFromNewsAPI('everything', {
      q,
      language: 'en',
      sortBy:   'relevancy',
      pageSize
    });

    const articles = (data.articles || [])
      .filter(a => a.title && a.url && !a.title.includes('[Removed]'))
      .map(a => enrichArticle(a, 'search', 'my'));

    res.json({ query: q, count: articles.length, articles });

  } catch (err) {
    console.error('[/api/news/search]', err.message);
    res.status(502).json({ error: 'Search failed.', detail: err.message });
  }
});

module.exports = router;
