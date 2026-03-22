/**
 * Source Genome Database
 * Each source entry contains:
 *   id          — NewsAPI source ID (matches their `sources` endpoint)
 *   name        — Display name
 *   lean        — 'l' | 'c' | 'r'  (ideological tendency)
 *   reliability — Float 1–5 (factual quality, independent of lean)
 *   country     — ISO 3166-1 alpha-2
 *   ownership   — 'Public' | 'Private' | 'Corporate' | 'Non-profit' | 'State'
 *   audience    — e.g. 'General', 'Business', 'Tech', 'Progressive'
 *   formats     — array of 'Breaking' | 'Analysis' | 'Opinion' | 'Longform' | 'Data'
 *   topicStrengths — topics the outlet covers with above-average depth
 *   notes       — short editorial note used in Source Genome cards
 */
const SOURCES = {
  // ── US Left-leaning ────────────────────────────────────────────────────────
  'the-new-york-times': {
    name: 'The New York Times', lean: 'l', reliability: 4.6,
    country: 'US', ownership: 'Corporate', audience: 'General',
    formats: ['Breaking', 'Analysis', 'Longform', 'Opinion'],
    topicStrengths: ['politics', 'culture', 'foreign-policy', 'science'],
    notes: 'High reliability; leans left on opinion pages; strong investigative unit.'
  },
  'the-washington-post': {
    name: 'The Washington Post', lean: 'l', reliability: 4.5,
    country: 'US', ownership: 'Corporate', audience: 'General',
    formats: ['Breaking', 'Analysis', 'Opinion'],
    topicStrengths: ['politics', 'tech-regulation', 'national-security'],
    notes: 'Amazon-owned; strong DC political coverage; left-leaning editorial stance.'
  },
  'the-guardian': {
    name: 'The Guardian', lean: 'l', reliability: 4.3,
    country: 'GB', ownership: 'Non-profit', audience: 'Progressive',
    formats: ['Breaking', 'Analysis', 'Longform', 'Opinion'],
    topicStrengths: ['environment', 'human-rights', 'tech-regulation', 'gender'],
    notes: 'Independently owned trust; strong global South and climate coverage.'
  },
  'msnbc': {
    name: 'MSNBC', lean: 'l', reliability: 3.5,
    country: 'US', ownership: 'Corporate', audience: 'General',
    formats: ['Breaking', 'Opinion'],
    topicStrengths: ['politics'],
    notes: 'Opinion-heavy; lower fact-check reliability; strong emotional framing.'
  },
  'buzzfeed': {
    name: 'BuzzFeed News', lean: 'l', reliability: 3.6,
    country: 'US', ownership: 'Private', audience: 'Young',
    formats: ['Breaking', 'Longform'],
    topicStrengths: ['culture', 'tech', 'investigations'],
    notes: 'Shut down news division 2023; archived investigations remain influential.'
  },
  'the-intercept': {
    name: 'The Intercept', lean: 'l', reliability: 3.7,
    country: 'US', ownership: 'Non-profit', audience: 'Progressive',
    formats: ['Longform', 'Opinion'],
    topicStrengths: ['national-security', 'foreign-policy', 'civil-liberties'],
    notes: 'Adversarial investigative; strong on surveillance and war; some accuracy controversies.'
  },
  'vice-news': {
    name: 'VICE News', lean: 'l', reliability: 3.8,
    country: 'US', ownership: 'Private', audience: 'Young',
    formats: ['Breaking', 'Longform'],
    topicStrengths: ['foreign-policy', 'culture', 'environment'],
    notes: 'Strong on-the-ground reporting; filed for bankruptcy 2023.'
  },

  // ── US Center / Wire ───────────────────────────────────────────────────────
  'associated-press': {
    name: 'Associated Press', lean: 'c', reliability: 4.8,
    country: 'US', ownership: 'Non-profit', audience: 'General',
    formats: ['Breaking', 'Data'],
    topicStrengths: ['breaking-news', 'elections', 'foreign-policy', 'economy'],
    notes: 'Gold standard for factual breaking news; minimal opinion output.'
  },
  'reuters': {
    name: 'Reuters', lean: 'c', reliability: 4.8,
    country: 'GB', ownership: 'Corporate', audience: 'Business',
    formats: ['Breaking', 'Data'],
    topicStrengths: ['economy', 'markets', 'foreign-policy', 'tech'],
    notes: 'Wire service; high speed, high accuracy; owned by Thomson Reuters.'
  },
  'bbc-news': {
    name: 'BBC News', lean: 'c', reliability: 4.5,
    country: 'GB', ownership: 'Public', audience: 'General',
    formats: ['Breaking', 'Analysis', 'Longform'],
    topicStrengths: ['foreign-policy', 'science', 'politics', 'culture'],
    notes: 'Public broadcaster; global reach; strong international correspondents.'
  },
  'npr': {
    name: 'NPR', lean: 'c', reliability: 4.4,
    country: 'US', ownership: 'Non-profit', audience: 'General',
    formats: ['Analysis', 'Longform'],
    topicStrengths: ['politics', 'science', 'culture', 'economy'],
    notes: 'Public radio; high reliability; slight center-left tilt on social issues.'
  },
  'axios': {
    name: 'Axios', lean: 'c', reliability: 4.3,
    country: 'US', ownership: 'Private', audience: 'Business',
    formats: ['Breaking', 'Analysis'],
    topicStrengths: ['tech', 'politics', 'economy'],
    notes: 'Known for brevity and go-deep format; business-friendly center stance.'
  },
  'politico': {
    name: 'Politico', lean: 'c', reliability: 4.2,
    country: 'US', ownership: 'Corporate', audience: 'Political',
    formats: ['Breaking', 'Analysis'],
    topicStrengths: ['politics', 'policy', 'elections'],
    notes: 'Insider political coverage; owned by Axel Springer; EU and US editions.'
  },
  'bloomberg': {
    name: 'Bloomberg', lean: 'c', reliability: 4.5,
    country: 'US', ownership: 'Private', audience: 'Business',
    formats: ['Breaking', 'Data', 'Analysis'],
    topicStrengths: ['economy', 'markets', 'tech', 'climate'],
    notes: 'Extremely reliable on financial and business news; light on social coverage.'
  },
  'the-hill': {
    name: 'The Hill', lean: 'c', reliability: 4.0,
    country: 'US', ownership: 'Corporate', audience: 'Political',
    formats: ['Breaking', 'Opinion'],
    topicStrengths: ['politics', 'policy'],
    notes: 'Bipartisan political coverage; some opinion pages pull right.'
  },
  'abc-news': {
    name: 'ABC News', lean: 'c', reliability: 4.2,
    country: 'US', ownership: 'Corporate', audience: 'General',
    formats: ['Breaking', 'Analysis'],
    topicStrengths: ['breaking-news', 'politics', 'health'],
    notes: 'Mainstream network; ABC/Disney ownership; solid factual record.'
  },
  'cbs-news': {
    name: 'CBS News', lean: 'c', reliability: 4.1,
    country: 'US', ownership: 'Corporate', audience: 'General',
    formats: ['Breaking'],
    topicStrengths: ['breaking-news', 'politics', 'economy'],
    notes: 'Mainstream network; long investigative tradition via 60 Minutes.'
  },

  // ── US Center-Left ─────────────────────────────────────────────────────────
  'cnn': {
    name: 'CNN', lean: 'l', reliability: 3.8,
    country: 'US', ownership: 'Corporate', audience: 'General',
    formats: ['Breaking', 'Opinion'],
    topicStrengths: ['breaking-news', 'politics', 'foreign-policy'],
    notes: 'Heavy opinion and emotional framing; reliability varies by reporter.'
  },
  'time': {
    name: 'TIME', lean: 'l', reliability: 4.1,
    country: 'US', ownership: 'Private', audience: 'General',
    formats: ['Longform', 'Analysis'],
    topicStrengths: ['politics', 'culture', 'science', 'foreign-policy'],
    notes: 'Legacy magazine; strong longform; center-left editorial voice.'
  },
  'the-atlantic': {
    name: 'The Atlantic', lean: 'l', reliability: 4.2,
    country: 'US', ownership: 'Private', audience: 'General',
    formats: ['Longform', 'Analysis', 'Opinion'],
    topicStrengths: ['culture', 'politics', 'science', 'foreign-policy'],
    notes: 'High-quality longform; explicitly holds editorial viewpoints; center-left.'
  },

  // ── US Right-leaning ──────────────────────────────────────────────────────
  'fox-news': {
    name: 'Fox News', lean: 'r', reliability: 2.8,
    country: 'US', ownership: 'Corporate', audience: 'Conservative',
    formats: ['Breaking', 'Opinion'],
    topicStrengths: ['politics', 'immigration', 'economy'],
    notes: 'Opinion-dominant; lowest factual reliability of major US networks; Murdoch-owned.'
  },
  'the-wall-street-journal': {
    name: 'Wall Street Journal', lean: 'r', reliability: 4.4,
    country: 'US', ownership: 'Corporate', audience: 'Business',
    formats: ['Breaking', 'Analysis', 'Opinion'],
    topicStrengths: ['economy', 'markets', 'tech', 'policy'],
    notes: 'High reliability on business news; right-leaning opinion section; News Corp.'
  },
  'national-review': {
    name: 'National Review', lean: 'r', reliability: 3.4,
    country: 'US', ownership: 'Non-profit', audience: 'Conservative',
    formats: ['Opinion', 'Analysis'],
    topicStrengths: ['politics', 'culture', 'economy'],
    notes: 'Conservative flagship magazine; opinion-heavy; founded by William Buckley.'
  },
  'breitbart-news': {
    name: 'Breitbart', lean: 'r', reliability: 2.2,
    country: 'US', ownership: 'Private', audience: 'Far-Right',
    formats: ['Breaking', 'Opinion'],
    topicStrengths: ['immigration', 'politics'],
    notes: 'Far-right; frequent misinformation; high emotional intensity framing.'
  },
  'new-york-post': {
    name: 'New York Post', lean: 'r', reliability: 3.0,
    country: 'US', ownership: 'Corporate', audience: 'General',
    formats: ['Breaking', 'Opinion'],
    topicStrengths: ['politics', 'crime', 'culture'],
    notes: 'Tabloid-adjacent; Murdoch-owned; strong breaking on crime and local NY news.'
  },

  // ── International ─────────────────────────────────────────────────────────
  'al-jazeera-english': {
    name: 'Al Jazeera', lean: 'c', reliability: 4.1,
    country: 'QA', ownership: 'State', audience: 'Global',
    formats: ['Breaking', 'Analysis', 'Longform'],
    topicStrengths: ['foreign-policy', 'Middle East', 'human-rights', 'Global South'],
    notes: 'Qatar state-funded; strong Global South and MENA coverage; some geopolitical bias.'
  },
  'deutsche-welle': {
    name: 'Deutsche Welle', lean: 'c', reliability: 4.4,
    country: 'DE', ownership: 'Public', audience: 'Global',
    formats: ['Breaking', 'Analysis'],
    topicStrengths: ['foreign-policy', 'Europe', 'Global South', 'economy'],
    notes: 'German public broadcaster; international edition; strong reliability.'
  },
  'the-hindu': {
    name: 'The Hindu', lean: 'c', reliability: 4.2,
    country: 'IN', ownership: 'Private', audience: 'Indian',
    formats: ['Breaking', 'Analysis', 'Opinion'],
    topicStrengths: ['South Asia', 'politics', 'economy', 'foreign-policy'],
    notes: 'Indian liberal newspaper; strong policy and regional South Asia depth.'
  },
  'financial-times': {
    name: 'Financial Times', lean: 'c', reliability: 4.6,
    country: 'GB', ownership: 'Corporate', audience: 'Business',
    formats: ['Breaking', 'Analysis', 'Data'],
    topicStrengths: ['economy', 'markets', 'Europe', 'tech', 'climate'],
    notes: 'Premium business journalism; Nikkei-owned; very high factual standards.'
  },
  'the-economist': {
    name: 'The Economist', lean: 'c', reliability: 4.5,
    country: 'GB', ownership: 'Private', audience: 'Business',
    formats: ['Analysis', 'Longform', 'Data'],
    topicStrengths: ['economy', 'foreign-policy', 'tech', 'science'],
    notes: 'Classically liberal; free-market leaning; exceptional data journalism.'
  }
};

/**
 * Look up a source by NewsAPI source ID.
 * Falls back to a neutral profile if the source is unknown.
 */
function getSource(id) {
  return SOURCES[id] || {
    name: id ? id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Unknown',
    lean: 'c', reliability: 3.5,
    country: 'US', ownership: 'Private', audience: 'General',
    formats: ['Breaking'],
    topicStrengths: [],
    notes: 'Source not in Viewpoint Atlas database — using neutral defaults.'
  };
}

/**
 * Infer a source profile from a domain string (used by the inject endpoint).
 */
const DOMAIN_TO_ID = {
  'nytimes.com': 'the-new-york-times',
  'washingtonpost.com': 'the-washington-post',
  'theguardian.com': 'the-guardian',
  'msnbc.com': 'msnbc',
  'theintercept.com': 'the-intercept',
  'vice.com': 'vice-news',
  'apnews.com': 'associated-press',
  'reuters.com': 'reuters',
  'bbc.com': 'bbc-news',
  'bbc.co.uk': 'bbc-news',
  'npr.org': 'npr',
  'axios.com': 'axios',
  'politico.com': 'politico',
  'bloomberg.com': 'bloomberg',
  'thehill.com': 'the-hill',
  'abcnews.go.com': 'abc-news',
  'cbsnews.com': 'cbs-news',
  'cnn.com': 'cnn',
  'time.com': 'time',
  'theatlantic.com': 'the-atlantic',
  'foxnews.com': 'fox-news',
  'wsj.com': 'the-wall-street-journal',
  'nationalreview.com': 'national-review',
  'breitbart.com': 'breitbart-news',
  'nypost.com': 'new-york-post',
  'aljazeera.com': 'al-jazeera-english',
  'dw.com': 'deutsche-welle',
  'thehindu.com': 'the-hindu',
  'ft.com': 'financial-times',
  'economist.com': 'the-economist'
};

function getSourceByDomain(domain) {
  const clean = domain.replace(/^www\./, '');
  const id = DOMAIN_TO_ID[clean];
  return { id: id || null, ...getSource(id) };
}

module.exports = { SOURCES, getSource, getSourceByDomain };
