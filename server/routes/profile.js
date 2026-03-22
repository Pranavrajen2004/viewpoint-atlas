/**
 * Profile Routes — /api/profile
 *
 * These endpoints derive personalised analytics from a user's reading history.
 * The client POSTs a list of article objects (already enriched by /api/news/*),
 * and the server computes the atlas intelligence layer on top.
 *
 * POST /api/profile/viewpoint — per-topic viewpoint map (radar chart data)
 * POST /api/profile/echo      — echo chamber score + per-lean breakdown
 * POST /api/profile/gaps      — coverage gaps (what topics/perspectives were missed)
 * POST /api/profile/drift     — timeline drift (how diet changed over time)
 */

const router = require('express').Router();
const { buildViewpointMap, buildCoverageGaps, computeEchoScore } = require('../data/analysis');
const { getSource } = require('../data/sources');

// ── POST /api/profile/viewpoint ───────────────────────────────────────────────
/**
 * Body: { articles: [...enrichedArticle] }
 *
 * Returns a per-topic viewpoint profile suitable for a radar chart.
 * Each topic entry includes:
 *   lean        — dominant lean ('l' | 'c' | 'r')
 *   score       — -100 (hard left) to +100 (hard right)
 *   confidence  — 'low' | 'medium' | 'high' (based on article count)
 *   count       — number of articles read for this topic
 *   breakdown   — { left: N, center: N, right: N }
 *
 * Also returns a global summary and confidence note.
 *
 * Example response:
 * {
 *   topics: {
 *     economy:        { lean: 'l', score: -42, confidence: 'high', count: 18, breakdown: {...} },
 *     environment:    { lean: 'l', score: -61, confidence: 'medium', count: 7, ... },
 *     foreign-policy: { lean: 'c', score: 5,   confidence: 'low', count: 2, ... }
 *   },
 *   global: { lean: 'l', score: -28, confidence: 'medium' },
 *   thinDataTopics: ['foreign-policy']   // topics with < 4 articles
 * }
 */
router.post('/viewpoint', (req, res) => {
  const articles = req.body.articles;
  if (!Array.isArray(articles) || articles.length === 0)
    return res.status(400).json({ error: 'articles array is required and must be non-empty.' });

  const topicMap = buildViewpointMap(articles);

  // Global score: weighted average across all topics
  let totalScore = 0, totalCount = 0;
  Object.values(topicMap).forEach(({ score, count }) => {
    totalScore += score * count;
    totalCount += count;
  });
  const globalScore = totalCount ? Math.round(totalScore / totalCount) : 0;
  const globalLean  = globalScore < -15 ? 'l' : globalScore > 15 ? 'r' : 'c';
  const globalConf  = totalCount >= 20 ? 'high' : totalCount >= 8 ? 'medium' : 'low';

  const thinDataTopics = Object.entries(topicMap)
    .filter(([, v]) => v.confidence === 'low')
    .map(([k]) => k);

  res.json({ topics: topicMap, global: { lean: globalLean, score: globalScore, confidence: globalConf }, thinDataTopics });
});

// ── POST /api/profile/echo ────────────────────────────────────────────────────
/**
 * Body: { articles: [...enrichedArticle] }
 *
 * Returns an echo chamber analysis.
 *   score        — 0 (total bubble) to 100 (fully diverse)
 *   grade        — 'A' through 'F' label for display
 *   leanBreakdown — { left: %, center: %, right: % }
 *   topSources   — top 5 sources by article count
 *   emotionalAvg — average emotional intensity across the feed
 *   alert        — null or string warning if score is very low
 *
 * Example response:
 * {
 *   score: 38,
 *   grade: 'D',
 *   leanBreakdown: { left: 72, center: 21, right: 7 },
 *   topSources: [{ name: 'The Guardian', count: 14, lean: 'l' }, ...],
 *   emotionalAvg: 42,
 *   alert: "Your feed is heavily left-leaning with low source variety."
 * }
 */
router.post('/echo', (req, res) => {
  const articles = req.body.articles;
  if (!Array.isArray(articles) || articles.length === 0)
    return res.status(400).json({ error: 'articles array is required and must be non-empty.' });

  const score = computeEchoScore(articles);

  // Lean breakdown as percentages
  const leanCounts = { l: 0, c: 0, r: 0 };
  const sourceCounts = {};
  let emotionalTotal = 0;

  articles.forEach(a => {
    const lean = a.source?.lean || 'c';
    leanCounts[lean]++;
    const name = a.source?.name || 'Unknown';
    if (!sourceCounts[name]) sourceCounts[name] = { name, count: 0, lean };
    sourceCounts[name].count++;
    // Sum dominant emotional score
    const scores = a.tone?.scores || {};
    emotionalTotal += Math.max(...Object.values(scores), 0);
  });

  const total = articles.length;
  const leanBreakdown = {
    left:   Math.round((leanCounts.l / total) * 100),
    center: Math.round((leanCounts.c / total) * 100),
    right:  Math.round((leanCounts.r / total) * 100)
  };

  const topSources = Object.values(sourceCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const emotionalAvg = Math.round(emotionalTotal / total);

  const grade = score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : score >= 35 ? 'D' : 'F';

  let alert = null;
  if (score < 30) {
    const dominant = leanBreakdown.left > 60 ? 'left' : leanBreakdown.right > 60 ? 'right' : 'center';
    alert = `Your feed is heavily ${dominant}-leaning with low source variety. Consider switching to Balanced or Outside My Bubble mode.`;
  }

  res.json({ score, grade, leanBreakdown, topSources, emotionalAvg, alert });
});

// ── POST /api/profile/gaps ────────────────────────────────────────────────────
/**
 * Body: { articles: [...enrichedArticle], topics: [...topicStrings] }
 *
 * For each topic in the provided list, identifies what perspectives the user
 * has missed — by lean, source type, and geographic origin.
 *
 * Returns an array of gap objects:
 * [
 *   {
 *     topic: 'economy',
 *     seen: 12,
 *     breakdown: { left: 1, center: 10, right: 1 },
 *     missing: ['Left-leaning perspective', 'International coverage']
 *   },
 *   ...
 * ]
 *
 * Topics with no gaps are omitted from the response.
 */
router.post('/gaps', (req, res) => {
  const { articles, topics } = req.body;
  if (!Array.isArray(articles))
    return res.status(400).json({ error: 'articles array is required.' });

  const topicList = Array.isArray(topics) && topics.length
    ? topics
    : [...new Set(articles.map(a => a.topic || 'general'))];

  const gaps = buildCoverageGaps(articles, topicList);
  res.json({ gaps, topicsAnalysed: topicList.length });
});

// ── POST /api/profile/drift ───────────────────────────────────────────────────
/**
 * Body: { articles: [...enrichedArticle] }
 * Each article must have publishedAt (ISO string).
 *
 * Groups articles by calendar week, then computes lean distribution + top sources
 * for each week — enabling "your media diet has shifted" visualisation.
 *
 * Returns:
 * {
 *   weeks: [
 *     {
 *       week:        '2026-W10',
 *       start:       '2026-03-02',
 *       end:         '2026-03-08',
 *       count:       23,
 *       leanDist:    { left: 52, center: 35, right: 13 },
 *       echoScore:   61,
 *       topSources:  ['The Guardian', 'BBC News', 'Reuters'],
 *       topTopics:   ['economy', 'environment'],
 *       driftFlags:  []         // e.g. ['Narrowed to 2 source families', 'Left share +18%']
 *     },
 *     ...
 *   ]
 * }
 */
router.post('/drift', (req, res) => {
  const articles = req.body.articles;
  if (!Array.isArray(articles) || articles.length === 0)
    return res.status(400).json({ error: 'articles array is required and must be non-empty.' });

  // Group by ISO week
  const weekMap = {};
  articles.forEach(a => {
    const date = a.publishedAt ? new Date(a.publishedAt) : new Date();
    const week = isoWeek(date);
    if (!weekMap[week]) weekMap[week] = { articles: [], start: date, end: date };
    weekMap[week].articles.push(a);
    if (date < weekMap[week].start) weekMap[week].start = date;
    if (date > weekMap[week].end)   weekMap[week].end   = date;
  });

  const weeks = Object.entries(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, { articles: arts, start, end }]) => {
      const leanCounts = { l: 0, c: 0, r: 0 };
      const srcNames   = {};
      const topicCounts = {};

      arts.forEach(a => {
        leanCounts[a.source?.lean || 'c']++;
        const n = a.source?.name || 'Unknown';
        srcNames[n] = (srcNames[n] || 0) + 1;
        const t = a.topic || 'general';
        topicCounts[t] = (topicCounts[t] || 0) + 1;
      });

      const total = arts.length;
      const leanDist = {
        left:   Math.round((leanCounts.l / total) * 100),
        center: Math.round((leanCounts.c / total) * 100),
        right:  Math.round((leanCounts.r / total) * 100)
      };

      return {
        week,
        start: start.toISOString().slice(0, 10),
        end:   end.toISOString().slice(0, 10),
        count: total,
        leanDist,
        echoScore:  computeEchoScore(arts),
        topSources: Object.entries(srcNames).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n),
        topTopics:  Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t)
      };
    });

  // Compute drift flags between consecutive weeks
  for (let i = 1; i < weeks.length; i++) {
    const prev = weeks[i - 1];
    const curr = weeks[i];
    const flags = [];
    const leftDelta = curr.leanDist.left - prev.leanDist.left;
    if (Math.abs(leftDelta) > 15) flags.push(`Left-lean share ${leftDelta > 0 ? '+' : ''}${leftDelta}% vs prior week`);
    if (curr.echoScore < prev.echoScore - 10) flags.push(`Echo score dropped ${prev.echoScore - curr.echoScore} points (feed narrowing)`);
    if (curr.topSources.length < prev.topSources.length) flags.push('Source variety narrowed this week');
    curr.driftFlags = flags;
  }
  if (weeks.length) weeks[0].driftFlags = [];

  res.json({ weeks });
});

// ── Helper: ISO week string ─────────────────────────────────────────────────
function isoWeek(date) {
  const d   = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const year = d.getUTCFullYear();
  const week = Math.ceil(((d - new Date(Date.UTC(year, 0, 1))) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

module.exports = router;
