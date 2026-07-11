# Scrap Alchemy — companion web app

Companion app for the cookbook *The Alchemist's Scrapbook* by M.G. Frank
("Turn leftovers and scraps into meals worth eating"). Deployed to
mgfrankbooks.com (DreamHost). The app is the book's marketing engine.

## What this app is (and is not)

- It teaches a METHOD: resourceful improvisational cooking — substitute by
  role not name, four flavor builders (salt / oil / acid / umami), templates
  over recipes, scraps into second life.
- It is explicitly NOT a recipe app. Never drift it toward a recipe matcher
  or a broad ingredient database — see HEURISTIC-AUDIT.md ("Content scope")
  before proposing anything in that direction.
- Content is curated from the book. All food-safety text (storage times,
  temperatures, botulism warnings) is vetted; never alter, soften, or extend
  safety content without explicit approval from the author.

## Files

- `scrap-alchemy.jsx` — the entire app. ONE FILE by design (it runs as a
  Claude artifact / single-file React component). Do not split it into
  modules or add a build system unless explicitly asked.
- `qa-harness.js` — logic regression tests (~1000 assertions). It extracts
  pure top-level functions from the jsx by name and evals them; any new
  shared logic must be written as pure top-level `function name(...)` with
  no React/imports if it should be testable.
- `HEURISTIC-AUDIT.md` — UX audit, session changelog, and the strategic
  decision record (pantry model, freemium, content scope, mastery ladder).
  Update its changelog when you make meaningful changes; parked decisions
  live there — do not "resolve" them unilaterally.
- `index.html`, `src/`, `vite.config.js`, `tailwind.config.js`,
  `postcss.config.js`, `package.json` — the publish wrapper (Vite +
  Tailwind 3.4) that turns the ONE-FILE jsx into a static site for
  mgfrankbooks.com. It must stay thin: the jsx is never split or edited to
  serve the wrapper. `src/storage.js` shims the artifact `window.storage`
  API onto localStorage (get → `{value}` or null, set → truthy on success,
  list → `{keys}`); if the jsx ever uses a new storage method, extend the
  shim to match the artifact contract exactly.

## Required workflow for EVERY change

1. Edit `scrap-alchemy.jsx`.
2. Validate the build (this, not brace-counting, is the check):
   ```
   npx --yes esbuild scrap-alchemy.jsx --bundle --external:react \
     --external:react-dom --external:lucide-react --external:recharts \
     --format=esm --outfile=/tmp/check.js --loader:.jsx=jsx
   ```
3. Run `node qa-harness.js` whenever logic changes. All assertions must
   pass. Grow the harness alongside new logic (match its existing
   extraction + `check()` style).
4. Run `npm run build` (Vite production build) — this is what actually
   ships; it must succeed in addition to the esbuild check above.
5. Commit with a clear message describing user-visible effect.

Publishing: `npm run build` emits `dist/` with relative asset paths (works
at the domain root or any subdirectory); upload its contents to DreamHost.

## Hard-won environment constraints (violating these breaks the app)

- iOS sandbox blocks native `confirm()` / `alert()` — never use them.
  Destructive actions use INLINE undo strips at the tap location (7s timer),
  not global confirms.
- Tailwind arbitrary values (e.g. `text-[0.55rem]`) do NOT compile in the
  artifact sandbox — use inline `style` for anything non-standard.
- No localStorage/sessionStorage assumptions beyond the existing
  `window.storage` async wrapper — persistence is per-device via that API.
- On iOS, never overlap scrolling content with sticky/fixed elements inside
  the same scroll container (compositing bugs). Restructure so nothing
  overlaps — e.g. the Home tab anchor is a fixed SIBLING of the scroll row,
  not sticky inside it. Two failed attempts taught this.
- Switching tabs must reset page scroll to top; never let `scrollIntoView`
  walk page-level ancestors (it jumps the page) — scroll containers by
  setting `scrollLeft` manually.

## Architecture rules (single sources of truth — do not fork these)

- `enrichScrap` / `enrichScraps`: THE source for pantry item status
  (daysLeft, zone, tone, `statusText`, needsSoon, sortKey). Pantry list,
  Builder chips, and the Home dashboard all consume it. Never re-derive
  status inline — two past bugs came from exactly that.
- `formatDaysLeft` has exactly one caller: `enrichScrap`. Keep it that way.
- `TAB_LABELS`, `TAB_ICONS`, `TAB_NOTES`, `TAB_GROUPS`: module-level maps
  shared by the nav, Home guide, and Settings. Tab order logic
  (`defaultTabOrder`, `moveGroup`, `moveTabInGroup`, `flattenTabOrder`,
  `isValidTabOrder`) is pure and QA-covered — Home pinned first, Support
  pinned last, tabs never leave their group.
- Custom (unknown-type) pantry items: `sortKey = Infinity`, never "past
  prime", never expire out of the Builder, no status suffix on chips.

## Design system — "Linen" theme

- Paper-white ground, sage green accent, soft terracotta spark; light/dark/
  auto via CSS vars (`--accent`, `--spark`, `--ink`, `--surface`, tints like
  `--accent-10`). Use the vars, never hard-coded colors.
- 1px borders, 3px rounding, Spectral 500 display serif for headings.
- Minimalism is a rule: controls appear only when they have something to do;
  dashboard cards render only when they have something to say.
- Voice: the book's — warm, human, un-pushy. No sales pressure in-app
  outside the Support tab. Avoid on-the-nose copy; the author edits wording
  closely, so propose copy changes rather than burying them in diffs.

## Testing

The author tests on iPhone via annotated screenshots. When you finish a
change, state exactly what to verify on the phone (specific taps, expected
results) — visual review is part of the definitive check, not optional.
