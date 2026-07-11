# Scrap Alchemy

Companion web app for the cookbook *The Alchemist's Scrapbook* by M.G. Frank —
"turn leftovers and scraps into meals worth eating." Not a recipe app: it teaches
the book's method (substitute by role, cook from templates, scraps into second life).

The entire app is one React component, `scrap-alchemy.jsx`, by design. The rest of
the repo is a thin Vite wrapper that turns it into a deployable static site.

## Develop

```
npm install
npm run dev        # local dev server
npm test           # logic QA harness (~1000 assertions) — run after any logic change
npm run build      # production build → dist/
npm run preview    # serve the production build locally
```

## Deploy

**GitHub Pages (current):** every push to `main` runs `.github/workflows/pages.yml`
(QA harness → build → deploy) and publishes to
<https://rpr5w285wh-cmyk.github.io/ScrapAlchemy/>. One-time setup: repo
Settings → Pages → Source: "GitHub Actions".

**DreamHost (eventual home):** `npm run build` produces a self-contained static
site in `dist/`. The build uses relative asset paths, so it works at the root of
mgfrankbooks.com or in any subdirectory — upload the *contents* of `dist/` to the
target directory.

## Where things live

- `scrap-alchemy.jsx` — the whole app (one file; see CLAUDE.md before changing it)
- `qa-harness.js` — pure-logic regression tests against the jsx
- `src/` — wrapper only: entry point, `window.storage` localStorage shim, Tailwind CSS entry
- `CLAUDE.md` — working rules, environment constraints, architecture invariants
- `HEURISTIC-AUDIT.md` — UX audit, changelog, product-decision record
