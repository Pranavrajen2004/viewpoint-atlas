# Viewpoint Atlas Security Audit

Date: 2026-03-23

## Executive Summary

This repository is a demo application, not a production-ready authenticated product.

- There is no attached database for users, sessions, or application data.
- The visible login/signup/account flow in the committed frontend is browser-only and stores state in `localStorage`.
- The CAPTCHA shown on the login/signup UI is demo/test only and is not an authoritative protection.
- An optional Express API exists and can be deployed through Vercel, but its auth implementation is also demo-grade and is not safe for real accounts.
- Dependency status on 2026-03-23: `npm audit --package-lock-only --json` returned 0 known vulnerabilities for both the root lockfile and `server/package-lock.json`.

Overall verdict: acceptable as a prototype/demo, not acceptable for real authentication, real user accounts, or any deployment that implies trusted persistence or bot resistance.

## Scope And Method

Reviewed:

- `/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/index.html`
- `/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/server/index.js`
- `/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/server/routes/auth.js`
- `/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/server/data/sources.js`
- `/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/package.json`
- `/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/server/package.json`
- `/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/README.md`
- `/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/vercel.json`
- `/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/api/index.js`

Commands run:

- `git status --short --branch`
- `rg --files`
- `rg -n "fetch\\(" index.html`
- `rg -n "sqlite|postgres|mysql|mongodb|mongoose|sequelize|prisma|knex|supabase|firebase|redis|db|database|pool|client" . -S`
- `npm audit --package-lock-only --json` in repo root
- `npm audit --package-lock-only --json` in `server/`

## Architecture Reality Check

### Database Status

No real database is attached.

Evidence:

- The only runtime dependencies are `cors`, `express`, `express-session`, and `node-fetch` in both manifests: [`package.json:9`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/package.json#L9) and [`server/package.json:10`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/server/package.json#L10).
- The server auth layer stores users in an in-memory `Map`, not a database: [`server/routes/auth.js:17`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/server/routes/auth.js#L17).
- The frontend stores users and session state in browser `localStorage`: [`index.html:5373`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/index.html#L5373).
- The so-called "Source Genome Database" is a static JavaScript object checked into the repo, not an external DB: [`server/data/sources.js:1`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/server/data/sources.js#L1).

### Is The Login / App Flow Real Or Demo?

The committed user-facing login flow is demo-only.

Evidence:

- The README explicitly describes a static frontend demo and says state is stored in the browser: [`README.md:21`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/README.md#L21), [`README.md:26`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/README.md#L26), [`README.md:81`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/README.md#L81).
- The frontend can be run from `python3 -m http.server` with no backend at all: [`README.md:32`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/README.md#L32).
- The only frontend `fetch()` call in `index.html` is to `/api/news/proxy`; the login/signup/account flows do not call `/api/auth/*`: [`index.html:4912`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/index.html#L4912).
- Login, signup, update-profile, delete-account, and session restore all run against `localStorage`: [`index.html:5410`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/index.html#L5410), [`index.html:5424`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/index.html#L5424), [`index.html:4437`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/index.html#L4437), [`index.html:4470`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/index.html#L4470), [`index.html:5574`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/index.html#L5574).

Conclusion:

- The login page and account-management UI are demo behavior only.
- Most of the app experience is client-side demo logic.
- The optional backend is present, but the committed frontend is not wired to use it for auth.

### CAPTCHA Status

The CAPTCHA is also demo/test only.

Evidence:

- The UI markup says the reCAPTCHA key is a test key that always passes: [`index.html:2723`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/index.html#L2723), [`index.html:2745`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/index.html#L2745).
- The frontend helper treats missing or broken `grecaptcha` as success: [`index.html:5405`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/index.html#L5405).
- The server-side auth route uses Google's public test secret: [`server/routes/auth.js:22`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/server/routes/auth.js#L22).

Conclusion:

- The CAPTCHA should be treated as presentation/demo UX only, not real anti-bot enforcement.

## Findings

### VA-001

- Severity: High
- Title: Frontend authentication is fully client-controlled
- Location: [`index.html:5373`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/index.html#L5373), [`index.html:5410`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/index.html#L5410), [`index.html:5424`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/index.html#L5424), [`index.html:4437`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/index.html#L4437), [`index.html:4470`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/index.html#L4470)
- Evidence:
  - `va_users` and `va_session` are read and written directly from `localStorage`.
  - Passwords are compared with `btoa(...)` in the browser.
  - Account update/delete logic edits browser state only.
- Impact:
  - Anyone controlling the browser can create accounts, forge a session, alter stored profile data, or bypass auth entirely.
  - There is no server-trusted identity and no real authorization boundary.
- Fix:
  - Move auth to a server-backed identity system with hashed passwords, server-side session or token validation, and persistent storage.
  - Remove password and session material from `localStorage`.
- Mitigation:
  - If this must remain a demo, label the auth UI as local-demo-only in the product and docs.

### VA-002

- Severity: High
- Title: Optional server auth is also demo-grade and unsafe for real accounts
- Location: [`server/routes/auth.js:17`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/server/routes/auth.js#L17), [`server/routes/auth.js:38`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/server/routes/auth.js#L38), [`server/routes/auth.js:68`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/server/routes/auth.js#L68), [`server/index.js:18`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/server/index.js#L18)
- Evidence:
  - Users are kept in an in-memory `Map`.
  - A demo account is seeded in code.
  - Passwords are stored as reversible base64, not password hashes.
  - The session secret is hardcoded in source.
  - `express-session` is used with the default in-process store.
- Impact:
  - Accounts disappear on restart or serverless instance churn.
  - Passwords are trivially reversible if memory or logs are exposed.
  - A hardcoded secret undermines trust in session integrity if the codebase is exposed.
- Fix:
  - Use a real datastore, password hashing (`argon2` or `bcrypt`), an environment-provided session secret, and a production session store.
- Mitigation:
  - If retained as demo code, isolate it from any real deployment path and label it as non-production auth.

### VA-003

- Severity: High
- Title: CAPTCHA is non-production and can be bypassed in the primary UI path
- Location: [`index.html:2723`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/index.html#L2723), [`index.html:2745`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/index.html#L2745), [`index.html:5405`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/index.html#L5405), [`server/routes/auth.js:22`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/server/routes/auth.js#L22)
- Evidence:
  - The page uses Google's test site key and documents that it always passes.
  - `_captchaOk()` returns `true` if `grecaptcha` is unavailable or throws.
  - The server uses the test secret instead of a real secret.
- Impact:
  - The application has no meaningful anti-automation control.
  - Users may believe they are protected by CAPTCHA when they are not.
- Fix:
  - Use a real site key and secret per environment.
  - Fail closed in the browser when CAPTCHA is required.
  - Keep authoritative verification on the server only.
- Mitigation:
  - Label the current CAPTCHA as demo/test-only anywhere the app is shown externally.

### VA-004

- Severity: Medium
- Title: The Express API is missing several production security baseline controls
- Location: [`server/index.js:16`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/server/index.js#L16), [`server/index.js:18`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/server/index.js#L18), [`server/index.js:42`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/server/index.js#L42), [`server/routes/auth.js:47`](/Users/pranavrajen/Desktop/Projects/AI-Sandbox/viewpoint-atlas/server/routes/auth.js#L47)
- Evidence:
  - No `helmet()` or visible security-header setup in app code.
  - No explicit `app.disable('x-powered-by')`.
  - No custom 404/error handler is active.
  - No auth rate limiting or brute-force protection is present.
  - CORS is configured as `origin: true` with `credentials: true`.
- Impact:
  - A real deployment would have weaker defaults against header-based hardening, fingerprinting, and auth abuse.
  - Reflecting arbitrary origins with credential support is not a safe long-term CORS posture.
- Fix:
  - Add `helmet()`, disable `x-powered-by`, add explicit 404/error handlers, add auth rate limiting, and tighten CORS to an allowlist.
- Mitigation:
  - Some protections may exist at the edge, but they are not visible in this repository and need runtime verification.

## Dependency Review

Audited on 2026-03-23:

- Root lockfile: `npm audit --package-lock-only --json`
- Server lockfile: `npm audit --package-lock-only --json`

Result:

- 0 critical
- 0 high
- 0 moderate
- 0 low

Interpretation:

- I did not find currently known npm advisory matches in the committed dependency trees.
- This does not offset the application-level findings above, which are architectural and code-design issues rather than package CVEs.

## Direct Answers To Your Questions

### Is there a DB attached?

No. I found no database driver, ORM, query layer, or external persistence integration. User data is either:

- stored in browser `localStorage`, or
- stored in a server-side in-memory `Map` that disappears on restart.

### Are the login and app pages demo-only?

Yes, explicitly.

- The committed login/signup/account UI is demo-only and browser-local.
- The app works as a static demo with no backend.
- The optional Express API exists, but the frontend is not wired to use it for auth.

### Is the CAPTCHA real?

No, not in any production sense.

- The frontend uses Google's public test site key and even comments that it always passes.
- The frontend helper also passes when the CAPTCHA library is missing or broken.
- The server uses Google's test secret.

## Recommended Next Steps

1. If this is meant to stay a demo, label auth, CAPTCHA, and account settings as local-demo-only in the UI.
2. If this is meant to become a real product, replace the entire auth stack with server-backed auth, real persistence, hashed passwords, real CAPTCHA keys, and hardened session handling.
3. Add baseline Express hardening before any public deployment: security headers, strict CORS, rate limiting, explicit error handling, and secret management from environment variables.
