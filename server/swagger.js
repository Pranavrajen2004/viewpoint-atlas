/**
 * OpenAPI 3.0 spec for Viewpoint Atlas API
 * Served at /api/docs via swagger-ui-express
 */

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Viewpoint Atlas API',
    version: '1.0.0',
    description:
      'Editorial intelligence layer — multi-source news aggregation, ideological profiling, echo chamber analysis, and source genome database.',
    contact: { name: 'Viewpoint Atlas', url: 'https://viewpoint-atlas.vercel.app' }
  },
  servers: [
    { url: 'https://viewpoint-atlas.vercel.app', description: 'Production (Vercel)' },
    { url: 'http://localhost:3001',              description: 'Local development' }
  ],
  tags: [
    { name: 'Auth',    description: 'Authentication & session management' },
    { name: 'News',    description: 'Multi-source news proxy & feed endpoints' },
    { name: 'Profile', description: 'Personalised analytics derived from reading history' },
    { name: 'Sources', description: 'Source genome database' }
  ],
  components: {
    schemas: {
      Article: {
        type: 'object',
        properties: {
          title:       { type: 'string' },
          description: { type: 'string', nullable: true },
          url:         { type: 'string', format: 'uri' },
          urlToImage:  { type: 'string', format: 'uri', nullable: true },
          publishedAt: { type: 'string', format: 'date-time', nullable: true },
          source: {
            type: 'object',
            properties: {
              id:   { type: 'string', nullable: true },
              name: { type: 'string' }
            }
          }
        }
      },
      EnrichedArticle: {
        allOf: [
          { $ref: '#/components/schemas/Article' },
          {
            type: 'object',
            properties: {
              source: {
                type: 'object',
                properties: {
                  lean:        { type: 'string', enum: ['l', 'c', 'r'] },
                  reliability: { type: 'number', minimum: 1, maximum: 5 },
                  country:     { type: 'string' },
                  ownership:   { type: 'string' }
                }
              },
              frames:   { type: 'array', items: { type: 'string' } },
              tone:     { type: 'object', properties: { dominant: { type: 'string' }, scores: { type: 'object' } } },
              whyShown: { type: 'string' },
              feedMode: { type: 'string' }
            }
          }
        ]
      },
      User: {
        type: 'object',
        properties: {
          username: { type: 'string' },
          email:    { type: 'string', format: 'email' }
        }
      },
      Error: {
        type: 'object',
        properties: { error: { type: 'string' } }
      }
    }
  },
  paths: {
    // ── Health ───────────────────────────────────────────────────────
    '/api/health': {
      get: {
        tags: ['Auth'],
        summary: 'Health check',
        responses: {
          200: { description: 'Service is running', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, service: { type: 'string' }, ts: { type: 'number' } } } } } }
        }
      }
    },

    // ── Auth ─────────────────────────────────────────────────────────
    '/api/auth/signup': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'email', 'password'],
                properties: {
                  username:     { type: 'string', minLength: 3 },
                  email:        { type: 'string', format: 'email' },
                  password:     { type: 'string', minLength: 6 },
                  captchaToken: { type: 'string', description: 'Google reCAPTCHA v3 token' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Account created', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, user: { $ref: '#/components/schemas/User' } } } } } },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Username already taken', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in and start a session',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username:     { type: 'string' },
                  password:     { type: 'string' },
                  captchaToken: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Logged in', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, user: { $ref: '#/components/schemas/User' } } } } } },
          401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Destroy current session',
        responses: {
          200: { description: 'Logged out' },
          500: { description: 'Session error' }
        }
      }
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Return current authenticated user',
        responses: {
          200: { description: 'Authenticated user', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } } } } },
          401: { description: 'Not authenticated' }
        }
      }
    },
    '/api/auth/update': {
      put: {
        tags: ['Auth'],
        summary: 'Update email or password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword'],
                properties: {
                  email:           { type: 'string', format: 'email' },
                  newPassword:     { type: 'string', minLength: 6 },
                  currentPassword: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Profile updated' },
          401: { description: 'Not authenticated or wrong current password' }
        }
      }
    },
    '/api/auth/account': {
      delete: {
        tags: ['Auth'],
        summary: 'Permanently delete account',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['password'], properties: { password: { type: 'string' } } } } }
        },
        responses: {
          200: { description: 'Account deleted' },
          401: { description: 'Wrong password' }
        }
      }
    },

    // ── News ─────────────────────────────────────────────────────────
    '/api/news/proxy': {
      get: {
        tags: ['News'],
        summary: 'Multi-source news proxy — all 5 APIs in parallel',
        description: 'Calls Guardian, GNews, NewsData.io, MediaStack and NewsAPI simultaneously. Results are merged, deduplicated by URL, sorted newest-first, and capped at pageSize.',
        parameters: [
          { name: 'q',        in: 'query', description: 'Search query', schema: { type: 'string', default: 'world news' } },
          { name: 'pageSize', in: 'query', description: 'Max articles to return (max 30)', schema: { type: 'integer', default: 25, maximum: 30 } }
        ],
        responses: {
          200: {
            description: 'Articles from all available sources',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status:              { type: 'string' },
                    totalResults:        { type: 'integer' },
                    articles:            { type: 'array', items: { $ref: '#/components/schemas/Article' } },
                    rateLimitedSources:  { type: 'array', items: { type: 'string' }, description: 'APIs that hit their daily quota' }
                  }
                }
              }
            }
          },
          503: { description: 'All sources unavailable' }
        }
      }
    },
    '/api/news/feed': {
      get: {
        tags: ['News'],
        summary: 'Personalised feed with mode and slider filtering',
        parameters: [
          { name: 'mode',        in: 'query', schema: { type: 'string', enum: ['my', 'balanced', 'bubble', 'reliability', 'global-south'], default: 'my' } },
          { name: 'topics',      in: 'query', description: 'Comma-separated topic keys', schema: { type: 'string', example: 'economy,environment' } },
          { name: 'novelty',     in: 'query', schema: { type: 'integer', minimum: 0, maximum: 100, default: 50 } },
          { name: 'spread',      in: 'query', schema: { type: 'integer', minimum: 0, maximum: 100, default: 50 } },
          { name: 'reliability', in: 'query', schema: { type: 'integer', minimum: 0, maximum: 100, default: 50 } },
          { name: 'emotional',   in: 'query', schema: { type: 'integer', minimum: 0, maximum: 100, default: 50 } },
          { name: 'pageSize',    in: 'query', schema: { type: 'integer', default: 20, maximum: 50 } }
        ],
        responses: {
          200: { description: 'Enriched, filtered feed', content: { 'application/json': { schema: { type: 'object', properties: { mode: { type: 'string' }, count: { type: 'integer' }, articles: { type: 'array', items: { $ref: '#/components/schemas/EnrichedArticle' } }, rateLimitedSources: { type: 'array', items: { type: 'string' } } } } } } }
        }
      }
    },
    '/api/news/topic/{topic}': {
      get: {
        tags: ['News'],
        summary: 'Left / center / right breakdown for a topic',
        parameters: [
          { name: 'topic', in: 'path', required: true, schema: { type: 'string', enum: ['economy','foreign-policy','tech-regulation','environment','gender','immigration','elections','health','media','finance'] } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 5, maximum: 15 } }
        ],
        responses: {
          200: { description: 'Left / center / right columns + top frames + timeline', content: { 'application/json': { schema: { type: 'object', properties: { topic: { type: 'string' }, columns: { type: 'object', properties: { left: { type: 'array', items: { $ref: '#/components/schemas/EnrichedArticle' } }, center: { type: 'array', items: { $ref: '#/components/schemas/EnrichedArticle' } }, right: { type: 'array', items: { $ref: '#/components/schemas/EnrichedArticle' } } } }, topFrames: { type: 'array', items: { type: 'object', properties: { frame: { type: 'string' }, count: { type: 'integer' } } } } } } } } }
        }
      }
    },
    '/api/news/search': {
      get: {
        tags: ['News'],
        summary: 'Free-text search across all sources',
        parameters: [
          { name: 'q',        in: 'query', required: true, schema: { type: 'string' } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20, maximum: 50 } }
        ],
        responses: {
          200: { description: 'Search results', content: { 'application/json': { schema: { type: 'object', properties: { query: { type: 'string' }, count: { type: 'integer' }, articles: { type: 'array', items: { $ref: '#/components/schemas/EnrichedArticle' } } } } } } },
          400: { description: 'Missing q parameter' }
        }
      }
    },

    // ── Profile ──────────────────────────────────────────────────────
    '/api/profile/viewpoint': {
      post: {
        tags: ['Profile'],
        summary: 'Compute per-topic viewpoint map (radar chart data)',
        description: 'Returns a -100 (hard left) to +100 (hard right) score per topic based on which outlets the user has read.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['articles'], properties: { articles: { type: 'array', items: { $ref: '#/components/schemas/EnrichedArticle' } } } } } } },
        responses: {
          200: { description: 'Per-topic scores + global summary', content: { 'application/json': { schema: { type: 'object', properties: { topics: { type: 'object', additionalProperties: { type: 'object', properties: { lean: { type: 'string' }, score: { type: 'integer' }, confidence: { type: 'string' }, count: { type: 'integer' } } } }, global: { type: 'object' }, thinDataTopics: { type: 'array', items: { type: 'string' } } } } } } }
        }
      }
    },
    '/api/profile/echo': {
      post: {
        tags: ['Profile'],
        summary: 'Echo chamber score (0–100) + grade',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['articles'], properties: { articles: { type: 'array', items: { $ref: '#/components/schemas/EnrichedArticle' } } } } } } },
        responses: {
          200: { description: 'Echo score A–F, lean breakdown, top sources', content: { 'application/json': { schema: { type: 'object', properties: { score: { type: 'integer' }, grade: { type: 'string', enum: ['A','B','C','D','F'] }, leanBreakdown: { type: 'object' }, topSources: { type: 'array' }, alert: { type: 'string', nullable: true } } } } } }
        }
      }
    },
    '/api/profile/gaps': {
      post: {
        tags: ['Profile'],
        summary: 'Coverage gaps — perspectives the user has missed',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['articles'], properties: { articles: { type: 'array', items: { $ref: '#/components/schemas/EnrichedArticle' } }, topics: { type: 'array', items: { type: 'string' } } } } } } },
        responses: { 200: { description: 'Gap analysis per topic' } }
      }
    },
    '/api/profile/drift': {
      post: {
        tags: ['Profile'],
        summary: 'Weekly drift — how the reading diet shifted over time',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['articles'], properties: { articles: { type: 'array', items: { $ref: '#/components/schemas/EnrichedArticle' } } } } } } },
        responses: { 200: { description: 'Per-week lean distribution, echo scores and drift flags' } }
      }
    },

    // ── Sources ──────────────────────────────────────────────────────
    '/api/sources': {
      get: {
        tags: ['Sources'],
        summary: 'Browse the source genome database',
        parameters: [
          { name: 'lean',    in: 'query', schema: { type: 'string', enum: ['l','c','r'] } },
          { name: 'country', in: 'query', schema: { type: 'string', example: 'US' } },
          { name: 'minRel',  in: 'query', schema: { type: 'number', minimum: 1, maximum: 5 } },
          { name: 'topic',   in: 'query', schema: { type: 'string', example: 'economy' } }
        ],
        responses: { 200: { description: 'Filtered, reliability-sorted source list' } }
      }
    },
    '/api/sources/{id}': {
      get: {
        tags: ['Sources'],
        summary: 'Single source genome card',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', example: 'the-guardian' } }],
        responses: {
          200: { description: 'Source genome card' },
          404: { description: 'Source not found' }
        }
      }
    }
  }
};

module.exports = { swaggerDefinition };
