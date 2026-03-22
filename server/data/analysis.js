/**
 * Analysis Engine
 * Provides:
 *   detectFrames(article)          → string[]   — narrative frames present
 *   detectEmotionalTone(article)   → object     — tone signals (outrage, fear, …)
 *   generateWhyShown(article, src, userProfile, mode) → string
 *   computeEchoScore(articles)     → number 0-100
 *   buildViewpointMap(articles)    → domain → { lean, confidence, count }
 *   buildCoverageGaps(articles, allArticles) → gap objects
 */

const { getSource } = require('./sources');

// ── Frame keyword map ────────────────────────────────────────────────────────
// Maps a frame label to keywords that trigger it (case-insensitive substring)
const FRAME_KEYWORDS = {
  'Public Safety':       ['crime','violence','shooting','safety','police','law enforcement','terrorism'],
  'Civil Liberties':     ['rights','freedom','privacy','due process','protest','censorship','surveillance'],
  'Economic Cost':       ['cost','billion','trillion','budget','deficit','GDP','jobs','unemployment','recession'],
  'Humanitarian Crisis': ['refugee','migrant','displacement','hunger','famine','civilian','casualty','aid'],
  'National Identity':   ['sovereignty','border','nation','patriot','culture','tradition','heritage'],
  'Public Health':       ['health','pandemic','vaccine','hospital','CDC','WHO','disease','outbreak'],
  'Environmental':       ['climate','emission','fossil','renewable','carbon','pollution','wildfire','flood'],
  'Corporate Power':     ['Big Tech','monopoly','antitrust','corporation','shareholder','profit','CEO'],
  'Government Accountability': ['corruption','oversight','investigation','impeach','accountability','scandal','fraud'],
  'Scientific Consensus': ['study','research','peer-review','scientist','evidence','data','findings'],
  'Electoral':           ['election','vote','ballot','campaign','democracy','polling','candidate'],
  'Market Forces':       ['market','supply','demand','inflation','trade','tariff','competition','free market'],
  'Strategic Competition': ['China','Russia','NATO','sanctions','geopolitical','deterrence','alliance'],
  'Social Justice':      ['inequality','racism','discrimination','justice','equity','marginalized','systemic'],
  'Tech Regulation':     ['AI','algorithm','data privacy','regulation','Silicon Valley','platform','digital']
};

// ── Emotional tone signals ───────────────────────────────────────────────────
const EMOTIONAL_KEYWORDS = {
  outrage:    ['outrage','outraged','fury','furious','scandal','shameful','disgrace','unacceptable','alarming'],
  fear:       ['threat','danger','crisis','catastrophe','collapse','risk','alarming','devastating','emergency'],
  hope:       ['breakthrough','progress','solution','improvement','recovery','achieve','milestone','success'],
  condemnation: ['condemn','denounce','wrong','immoral','irresponsible','reckless','unethical','corrupt'],
  celebration: ['celebrate','victory','triumph','landmark','historic','achievement','win','record'],
  uncertainty: ['unclear','unknown','uncertain','debate','disputed','controversy','question']
};

/**
 * Detect which narrative frames are active in an article.
 * Scans title + description.
 */
function detectFrames(article) {
  const text = `${article.title || ''} ${article.description || ''}`.toLowerCase();
  const found = [];
  for (const [frame, keywords] of Object.entries(FRAME_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw.toLowerCase()))) {
      found.push(frame);
    }
  }
  return found.length ? found : ['General Reporting'];
}

/**
 * Detect emotional tone signals in an article.
 * Returns { dominant, scores: { outrage, fear, hope, condemnation, celebration, uncertainty } }
 */
function detectEmotionalTone(article) {
  const text = `${article.title || ''} ${article.description || ''}`.toLowerCase();
  const scores = {};
  for (const [tone, keywords] of Object.entries(EMOTIONAL_KEYWORDS)) {
    scores[tone] = keywords.filter(kw => text.includes(kw)).length;
  }
  const dominant = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  const total = Object.values(scores).reduce((s, v) => s + v, 0) || 1;
  const normalised = {};
  for (const [k, v] of Object.entries(scores)) normalised[k] = Math.round((v / total) * 100);
  return { dominant: scores[dominant] > 0 ? dominant : 'neutral', scores: normalised };
}

/**
 * Generate a plain-language "Why this is in your feed" explanation.
 */
function generateWhyShown(article, source, userProfile = {}, mode = 'my') {
  const leanLabel  = { l: 'left', c: 'center', r: 'right' }[source.lean] || 'center';
  const topic      = (article._topic || 'general news').replace(/-/g, ' ');
  const frames     = article._frames || [];
  const primaryFrame = frames[0] || 'General Reporting';

  const modeReasons = {
    'my':           `Matched your interest in ${topic} and your reading history with ${leanLabel}-leaning sources.`,
    'balanced':     `Added to balance your feed — from a ${leanLabel}-leaning source you don't usually read.`,
    'bubble':       `Outside your typical source cluster — this outlet appears rarely in your history.`,
    'reliability':  `Selected because ${source.name} scores ${source.reliability}/5 on factual reliability — above your threshold.`,
    'global-south': `Included under Global South Lens — covers the story from a non-Western vantage point.`
  };

  const profileHints = [];
  if (userProfile.underconsumedLean === source.lean)
    profileHints.push(`you've under-consumed ${leanLabel}-leaning coverage this week`);
  if (userProfile.topTopics && userProfile.topTopics.includes(article._topic))
    profileHints.push(`${topic} is one of your most-read topics`);
  if (source.reliability >= 4.5)
    profileHints.push(`${source.name} is one of the highest-reliability sources in the database`);

  const base = modeReasons[mode] || modeReasons['my'];
  const extra = profileHints.length ? ` Also: ${profileHints.join('; ')}.` : '';
  return `${base}${extra} Primary frame detected: "${primaryFrame}".`;
}

/**
 * Compute an echo chamber score (0 = total echo, 100 = perfectly diverse).
 * Based on lean distribution and source variety.
 */
function computeEchoScore(articles) {
  if (!articles.length) return 50;

  const leanCounts = { l: 0, c: 0, r: 0 };
  const sourcesSeen = new Set();

  articles.forEach(a => {
    const src = getSource(a.source?.id);
    leanCounts[src.lean] = (leanCounts[src.lean] || 0) + 1;
    if (a.source?.id) sourcesSeen.add(a.source.id);
  });

  const total = articles.length;
  const props = Object.values(leanCounts).map(n => n / total);

  // Shannon entropy (0 = uniform, 1 = max diversity for 3 categories)
  const entropy = -props.reduce((s, p) => s + (p > 0 ? p * Math.log2(p) : 0), 0);
  const maxEntropy = Math.log2(3); // log2(3) ≈ 1.585
  const leanDiversity = entropy / maxEntropy; // 0–1

  // Source variety bonus
  const sourceVariety = Math.min(sourcesSeen.size / 10, 1); // 10+ sources = full score

  // Weighted: 70% lean diversity, 30% source variety
  const raw = leanDiversity * 0.7 + sourceVariety * 0.3;
  return Math.round(raw * 100);
}

/**
 * Build a per-topic viewpoint map from a list of read articles.
 * Returns { [topic]: { lean: 'l'|'c'|'r', score: -100..100, confidence: 'low'|'medium'|'high', count } }
 * score < 0 = left, > 0 = right, 0 = center
 */
function buildViewpointMap(articles) {
  const topicBuckets = {};

  articles.forEach(a => {
    const topic = a._topic || 'general';
    const src   = getSource(a.source?.id);
    if (!topicBuckets[topic]) topicBuckets[topic] = { l: 0, c: 0, r: 0, count: 0 };
    topicBuckets[topic][src.lean]++;
    topicBuckets[topic].count++;
  });

  const result = {};
  for (const [topic, counts] of Object.entries(topicBuckets)) {
    const { l, c, r, count } = counts;
    const score   = Math.round(((r - l) / count) * 100);
    const lean    = score < -15 ? 'l' : score > 15 ? 'r' : 'c';
    const confidence = count >= 10 ? 'high' : count >= 4 ? 'medium' : 'low';
    result[topic]    = { lean, score, confidence, count };
  }
  return result;
}

/**
 * Build coverage gaps: for each topic, list source types the user hasn't seen.
 */
function buildCoverageGaps(userArticles, allTopics) {
  const SOURCE_TYPES = ['Wire Service', 'Public Broadcaster', 'Independent', 'Business Press', 'International'];

  const seen = {};
  userArticles.forEach(a => {
    const t = a._topic || 'general';
    const s = getSource(a.source?.id);
    if (!seen[t]) seen[t] = { left: 0, center: 0, right: 0, sources: new Set() };
    seen[t][s.lean === 'l' ? 'left' : s.lean === 'r' ? 'right' : 'center']++;
    seen[t].sources.add(a.source?.id);
  });

  return allTopics.map(topic => {
    const bucket = seen[topic] || { left: 0, center: 0, right: 0, sources: new Set() };
    const total  = bucket.left + bucket.center + bucket.right;

    const missing = [];
    if (bucket.left === 0 && total > 0)   missing.push('Left-leaning perspective');
    if (bucket.right === 0 && total > 0)  missing.push('Right-leaning perspective');
    if (bucket.center === 0 && total > 0) missing.push('Wire-service / neutral reporting');
    if (bucket.sources.size < 3)          missing.push('Broader source variety (only ' + bucket.sources.size + ' source' + (bucket.sources.size === 1 ? '' : 's') + ' seen)');

    return {
      topic,
      seen: total,
      breakdown: { left: bucket.left, center: bucket.center, right: bucket.right },
      missing
    };
  }).filter(g => g.missing.length > 0);
}

module.exports = {
  detectFrames,
  detectEmotionalTone,
  generateWhyShown,
  computeEchoScore,
  buildViewpointMap,
  buildCoverageGaps
};
