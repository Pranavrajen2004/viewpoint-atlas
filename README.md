# Viewpoint Atlas

Viewpoint Atlas is an editorial-style prototype for exploring your media diet.
It turns a reading history into a newspaper-like intelligence product with:

- a viewpoint map by topic
- an echo-chamber score
- coverage-gap analysis
- rerankable feed modes
- story anatomy in article detail views
- source genome cards
- a world-map style coverage atlas
- a reading challenge
- a belief-audit journal
- a weekly media diet report

## Demo Status

This repo currently runs as a static front-end demo.
There is no build step required for the committed demo experience.

State is saved in the browser with `localStorage`, so demo reading history and journal notes persist locally on the same machine/browser.

## Download And Run The Demo

### Option 1: Clone with Git

```bash
git clone <repo-url>
cd viewpoint-atlas
python3 -m http.server 8000
```

Open:

```text
http://127.0.0.1:8000/index.html
```

### Option 2: Download ZIP

1. Download the repository as a ZIP.
2. Extract it.
3. Open a terminal in the extracted folder.
4. Run:

```bash
python3 -m http.server 8000
```

5. Visit `http://127.0.0.1:8000/index.html`.

## How To Use

### Quick Demo Flow

1. Open the app in the browser.
2. Click `Read the demo edition →` on the sign-in screen.
3. Pick at least two topics in onboarding.
4. Pick a few familiar outlets.
5. Let the atlas generate your dashboard.

### Recommended Presentation Flow

1. Start on `Dashboard`.
2. Show the `Personal Viewpoint Map`, `Coverage Gap Scanner`, and `Timeline Drift Tracker`.
3. Scroll to `Weekly Media Diet Report`, `Reading Challenge`, and `Belief Audit Journal`.
4. Open `My Feed` and move the rerank sliders to show the feed reordering.
5. Switch between `My Feed`, `Balanced Feed`, `Outside My Bubble`, `Only High-Reliability`, and `Global South Lens`.
6. Open an article card to show `story anatomy`, the `source genome`, and the `reliability × bias matrix`.
7. Open `Topics` to show left/center/right coverage, the story timeline, the atlas world map, and source genome cards.

## Notes For Demo Use

- The app is designed to be served from `localhost`.
- The committed demo works without any external API key.
- If you use the journal or demo login, data is stored only in your browser.
- Refreshing the page keeps local demo state unless browser storage is cleared.

## Files

- `index.html`: main demo application
- `README.md`: setup and demo instructions

## Hosting Status

As of now, this project is not configured with a Git remote or deployment target in this repository.

That means:

- no GitHub remote is configured
- no Vercel / Netlify / GitHub Pages config was found here
- there is no confirmed live hosted URL from this repo state

## Local Development

Serve the static app:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://127.0.0.1:8000/index.html
```
