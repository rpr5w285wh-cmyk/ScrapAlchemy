# Scrap Alchemy — Heuristic Audit

A structured review against established usability, information-architecture, and content
heuristics (Nielsen's 10 + IA/content-design principles). Findings are grounded in the
actual app as built, not hypothetical personas. Each finding has a severity:

- 🔴 **High** — likely to block or frustrate a real user; fix before launch.
- 🟠 **Medium** — friction or confusion; worth addressing.
- 🟢 **Low / polish** — minor; address opportunistically.
- ✅ **Strength** — working well; keep.
- ✔️ **Resolved** — addressed; see the changelog at the bottom.

---

## 1. Visibility of system status

✅ **Strength.** Pantry items show clear, plain-language status ("Use today", "2 weeks
left", "Past its prime") with a color tone. The Show filter shows live counts. Save/used/
tossed actions update immediately.

✔️ **Resolved — action feedback + undo.** Destructive actions (delete / toss / clear) now
show an inline undo strip at the tap location, and a transient toast confirms actions. (Was:
no feedback after destructive/confirming actions.)

✔️ **Resolved — "In rotation" badge removed (Road A).** The badge and its `lastUsed`/
`inRotation`/`markUsed` machinery were cosmetic (a do-nothing pat-on-the-back) and have been
cut entirely. Pantry actions are now honest: **save**, **browse**, and **remove** — where
removal is framed as either **"Used it up"** (a win) or **"Discarded"** (couldn't be saved),
replacing the waste-toned "Tossed it". This aligns the pantry's vocabulary with what it
actually is: a list, not a ledger. (See the pantry-model note below.)

---

## 2. Match between system and the real world

✅ **Strength.** Language is consistently the book's voice — "alchemist's pantry",
"from your kitchen", warm and human. Storage uses real-world locations (fridge/freezer/
pantry) with recognizable icons.

✔️ **Resolved — "anchor" jargon removed.** Builder hints now read "Starts with pasta — add
some to build this" etc.; empty-state and ideas-caption reworded; the Stock-from-Scraps body
now says "a starchy base". No user-facing "anchor" remains. (Was: "Add pasta to anchor this.")

🟢 **Low — scrap-type names mix specificity.** Some are very specific ("Raw Infused Oil
(garlic, fresh herbs)") and some broad ("Relishes & Sauces"). Fine, but the breadth gap
shows up as the one storage card with no actionable template. **(Still open — see C&D.)**

---

## 3. User control and freedom

✅ **Strength.** The unified back-stack lets users retrace deep-dive → template → deep-dive
chains exactly; X closes everything. Filters auto-clear when they'd strand the user on an
empty list. Theme is freely switchable.

✔️ **Resolved — undo on delete.** Trash / "Tossed it" now uses a 7-second inline undo before
the item is actually removed; clear-all is also undoable. (Was: permanent delete, no undo.)

---

## 4. Consistency and standards

✅ **Strength.** After the Linen pass, borders, rounding, type weight, and location icons
are consistent across cards, controls, modals, and forms — one shared `LocationTag`,
one `Dropdown`, one card treatment. Tab labels + icons now come from shared module-level
maps (`TAB_LABELS` / `TAB_ICONS`) so the nav, Home dashboard, and Settings never drift.

🟢 **Low — dashed borders carry two meanings.** Dashed = "add/ideas" on the Add button and
the locked "Ideas to explore" template cards (coherent). The collapsed "App guide" divider
on Home also uses a dashed top border — verify the signal isn't diluting. **(Watch.)**

---

## 5. Error prevention

✅ **Strength.** Custom items are never flagged "past prime". Date defaults to today.
Food-safety warnings appear inline on risky types (botulism on raw garlic oil, reheat temps).

🟠 **Medium — free-text search has no empty-safe guidance beyond "no match".** Minor; a
zero-result search could suggest clearing or offer the closest category. **(Still open.)**

---

## 6. Recognition rather than recall

✅ **Strength.** The builder surfaces what you can make from what you have. Deep-dive links
are inline in prose. The Home dashboard now surfaces "use soon" items and "what can you make"
directly, so the next action is recognized, not recalled.

✔️ **Resolved (partial) — tab discoverability.** The tab row now has edge-fade affordances and
a pinned, collapsing **Home** anchor; first-run orientation lives on the Home tab. (See IA.)

---

## 7. Flexibility and efficiency of use

✅ **Strength.** Theme cycles from Settings; "Use them up" template shortcuts accelerate the
past-prime task. Tab order is now user-customizable (group-locked reorder in Settings), and
the launch tab is selectable ("Start on").

🟢 **Low — no bulk actions.** Clearing/filtering many items is one-at-a-time. Fine at typical
pantry sizes. **(Still open — revisit only if users log dozens.)**

---

## 8. Aesthetic and minimalist design

✅ **Strength.** The Linen look is calm and uncluttered; controls appear only when needed
(>3 items). The Home dashboard follows the same principle — each card (use-soon, what-can-you-
make, last-saved, guide) renders only when it has something to say.

🟢 **Low — header is tall.** The header block takes significant vertical space on every tab.
Could condense on inner tabs so content starts higher. **(Still open — judgment call.)**

---

## 9. Help users recognize, diagnose, recover from errors

✅ **Strength.** Empty/zero states are honest and actionable.

✔️ **Resolved — status-time provenance.** Tapping any tracked status chip now reveals a
zone-aware explanation of the "cautious end of each range" logic, in the card's existing
note style. The page footnote remains as an at-a-glance backstop. (Was: provenance only in a
detached footnote.)

---

## 10. Help and documentation

✅ **Strength.** The app *is* the documentation — templates, deep-dives, substitution and
storage guides, the book voice throughout.

✔️ **Resolved — first-run orientation.** Grew into a full **Home tab / dashboard**: the daily
welcome card + a tappable "how this works" loop (three steps + tab map) for new users, which
demotes to a collapsible **"App guide"** once the user has pantry data. A persistent, on-demand
answer that didn't exist when the welcome series was the only orientation. (Was: no first-run
orientation beyond the transient welcome series.)

---

## Information architecture

✅ **Strength.** Tabs map cleanly to distinct jobs. The Meal Template gave Templates a
"start here" framework.

✔️ **Resolved — tab overflow on small screens.** The seven scrolling tabs now sit beside a
pinned, collapsing **Home** anchor (icon-only when scrolled), with left/right edge fades
hinting at off-screen tabs. Home is also the default landing tab (configurable). (Was: tabs
scrolled off with no affordance, cut off mid-word.)

📝 **New structure.** Eight tabs in five groups: Home (pinned first) · Cooking (Meal Builder,
My Pantry) · Recipes & notes (Templates, My Scrapbook) · Reference (Substitutions, Storage &
Safety) · Support (pinned last). Middle three groups are user-reorderable; tabs reorder within
their group. Footer carries Share · Support · Settings on every page.

---

## Content & data completeness

✅ Covers all of the book's Appendix V templates (The Alchemist's Meal) plus Stock from
Scraps; substitutions include Spices + the three blend recipes; scrap-types include Stock or
Broth. Materially complete against the book.

🟢 **Low — "Relishes & Sauces" storage card still has no template link.** Genuinely too broad
to map to one template; an honest exception. Could link to the Meal Template as a generic
"use it up" path. **(Still open — polish.)**

---

## Recommended priority order (original)

1. ✔️ Action feedback + undo on delete (#1, #3) — **done.**
2. ✔️ Reword "anchor" (#2) — **done.**
3. ✔️ Tab discoverability on small screens (IA) — **done.**
4. ✔️ Tap-to-explain on status provenance (#9) — **done.**
5. First-run orientation ✔️ **done** (became the Home dashboard); header condensing
   and "In rotation" hint remain as polish.

**All launch-relevant audit items are resolved.** Remaining items are 🟢 polish, tracked below.

---

## Still open (polish, non-blocking)

- 🟢 Header is tall; could condense on inner tabs (#8).
- 🟠 Zero-result search could offer guidance beyond "no match" (#5).
- 🟢 No bulk actions in the pantry (#7).
- 🟢 "Relishes & Sauces" storage card has no template link (content).
- 🟢 Verify dashed-border signal isn't diluting now that the Home "App guide" divider uses one (#4).

---

## Changelog — publish scaffolding session (July 2026)

- Moved the app into the ScrapAlchemy git repo and made it publishable as a real
  static site (it previously ran only inside the Claude artifact sandbox):
  - Thin Vite + Tailwind 3.4 wrapper around the untouched one-file jsx
    (`index.html`, `src/main.jsx`, `src/index.css`, configs). Tailwind 3.4 chosen
    to match the artifact sandbox's defaults (v4 changed border-color/scales →
    visual-drift risk).
  - `src/storage.js`: `window.storage` shim on localStorage, matching the artifact
    contract exactly (get → `{value}`, set → truthy, list → `{keys}`), keys
    namespaced `scrapalchemy:` so `list()` never sees foreign data.
  - `vite build` with `base: "./"` → `dist/` works at the domain root or any
    subdirectory of mgfrankbooks.com. Deployment automation deliberately deferred.
  - `npm test` runs the QA harness (1002 assertions — all green, file unchanged).
  - Verified the production build headlessly (Chromium): renders, tabs navigate,
    pantry works, all app state persists across reload via the shim. The only
    external request is Google Fonts (self-loading `@import`, unchanged).

## Changelog — this session

- Reworded all user-facing "anchor" jargon in the builder; "starchy anchor" → "starchy base".
- Tab row: edge-fade scroll affordances; hidden scrollbar; active tab scrolls into view.
- Fixed tab-row scroll bugs: `scrollIntoView` was fighting user scrolling and jumping the
  whole page; replaced with horizontal-only scroll + page-top reset on tab change.
- Tap-to-explain on pantry status chips (zone-aware provenance note).
- Added the **Home tab** as the app's front door / dashboard:
  - Houses the daily welcome card, then how-this-works (tappable steps + tab map).
  - Dashboard cards appear only when they have something to say: "use soon" (aging/past-prime
    items), "what can you make" (pantry → builder), "last saved" (recent scrapbook entry).
  - How-this-works leads for new users; demotes to a collapsible **"App guide"** once
    established (pantry has data), with no duplicate heading.
- **Start on** setting (selectable launch tab; default Home).
- **Group-locked tab reordering** in Settings (reorder groups + tabs within groups, via
  arrows; Home pinned first, Support pinned last; reset-to-default).
- Restored the header theme toggle; removed the redundant `?` Help button (orientation now
  lives on Home). Header = Theme + Settings.
- Footer gained a **Settings** link (inline with Share · Support; wraps gracefully).
- Pinned, collapsing **Home** tab anchor (house icon; collapses to icon-only when scrolled);
  restructured so the other tabs scroll beside it rather than under it (fixes iOS show-through).
- Home tab rows and step cards are tappable (navigate to their tab); link affordance on the
  tab name itself.
- Renamed internal tab groups to plain language (Cooking / Recipes & notes / Reference).
- Tab labels + icons unified into shared `TAB_LABELS` / `TAB_ICONS` maps.
- Extracted pantry status math into pure `enrichScrap` / `enrichScraps` (shared by Pantry +
  dashboard).
- QA harness grew 962 → 998 assertions: tab-order reorder invariants (23) + scrap enrichment
  (13). All green.
- Reworded the "In rotation" pantry badge to "Used recently" — then, on reflection, removed
  it entirely along with the `markUsed`/`lastUsed`/`inRotation` machinery (Road A): the action
  did nothing functional. Pantry removal is now framed honestly as "Used it up" / "Discarded"
  (replacing "Tossed it"). QA dropped the 4 obsolete markUsed/inRotation assertions → 994.

### Post-session review pass (fresh-eyes audit of the accumulated changes)

- **Bug fixed — custom items vanished from the Meal Builder.** The Builder's `usableScraps`
  used an inline duplicate of the enrichment logic that treated custom (unknown-type) items as
  0-day items, silently filtering them out after the day they were stored. Now uses the shared
  `enrichScrap` (customs get `sortKey = Infinity`, stay selectable indefinitely, sort last).
- **Bug fixed — status wording could disagree across screens.** `enrichScrap` computed the
  status text and threw it away; the Home dashboard invented its own countdown format
  (short-end `Nd left`) that could contradict the Pantry's wording for the same item.
  `enrichScrap` now returns `statusText`, and all three surfaces (Pantry list, Builder chips,
  Home use-soon card) consume it. `formatDaysLeft` now has exactly one caller: `enrichScrap`.
  The dashboard's compact slot trims advisory clauses at the em-dash ("Use soon — check it
  before using" → "use soon") — a truncation of the one source, not a second derivation.
- Custom-item Builder chips no longer show a status suffix (name alone; "No expiry tracked"
  was noise at chip scale).
- QA: +8 assertions covering statusText single-sourcing and the builder-usable filter → **1002**.

## Parked for a future deliberate pass

**North star (unchanged):** teach the book's method of resourceful, improvisational cooking —
templates over recipes, substitute by role, the four flavor builders, scraps into second life.
Everything below is *possible territory in service of that*, not a new mission.

### Potential new territory — the mastery ladder (a learning app, not a recipe app)

Framing the app as a **learning tool** (which it already is) opens a direction the recipe-matcher
competitors structurally can't follow: teach not just *what to substitute* but *how to reason*, in
escalating depth. This is a possible destination, not the next sprint — but it unifies the parked
decisions, so it's recorded as the thesis they ladder toward.

**The skill ladder (a long runway to mastery):**
- **L1 — direct substitution:** X→Y ("lemon→lime, both acids").
- **L2 — substitute by role:** reason from function ("I need brightness — what do I have that
  brightens?") rather than name-matching.
- **L3 — transitive substitution:** X→Z because X→Y and Y→Z worked; combinatorial reasoning.
- **L4 — breaking the rules on purpose:** knowing *why* a pairing "shouldn't" work and doing it
  anyway (the book's blue-cheese-on-hot-steak, the pesto-born-of-loss). Layered throughout:
  ingredient literacy, cultural context, the *why* behind techniques.

**Why this is strategically strong:**
- **Graduation-positive.** A teaching app should *want* students to eventually outgrow it; the
  honest move is to be the best teacher and make the journey long and rich. This sidesteps the
  engagement/retention dark patterns the recipe apps rely on, and fits the book's un-pushy ethos.
- **Solves the freemium problem cleanly.** Monetize on **depth (levels), not breadth (data)** —
  beginner rules free, advanced/combinatorial/rule-breaking modes paid. Aligned with the mission
  instead of in tension with it. A recipe database has no "levels"; this does.
- **The runway is genuinely long.** Role/transitive/rule-breaking substitution is years of
  material, not weeks — plenty of room to teach (and charge for teaching) before anyone graduates.
- **Retroactively justifies the existing calls:** "not a recipe app", method-over-recipes,
  curated-not-broad, the Home tab as a *practice* surface.

**Honest risks / what makes it a big bet:**
- **Far more to build than anything done so far.** Levels imply *progression* — the app must track
  where a user is and gate/unlock accordingly. That's a curriculum + a progression engine, the most
  ambitious direction on the table.
- **Teaching apps have brutal completion rates.** The "long runway" only pays off for the minority
  who stay. The realistic buyer is the **already-motivated book reader** (warm, self-selected, but a
  smaller pool than cold app-store traffic) — consistent with free = discovery/teaching aid, paid =
  the reader who wants to go deep.
- **Authoring the curriculum is a writing project, not just code.** L3–L4 can't be scraped or
  AI-generated without losing the voice that is the whole edge. The author has to write the
  progression — arguably book-#2's worth of thinking.
- **Don't let the vision stall shippable wins.** The current app is a good teaching aid *as-is*; the
  ladder is a destination, not a prerequisite for it being finished.

**Cheap validation (same shape as Road B):** teach *one* rung up for free — e.g. a Level-2
"substitute by role" mode or a single transitive-substitution lesson — and watch whether engaged
users climb it. Appetite for one rung validates the ladder before building the whole curriculum +
progression engine. Don't build the engine on faith.

---

- Option to hide the Home and/or Support tabs once a user is past needing them.
- A book-quote epigraph at the top of the Home tab (food-safety ethos anchor).
- Default Core/Cooking order: currently Builder-then-Pantry; the Home steps narrate
  Pantry-first. Left to the user via reordering, but the default could flip if desired.

### The pantry model — Road A vs Road B (a real product-direction decision)

The cleanup above (Road A) settled the pantry as a **list**: save / browse / remove. The
do-nothing "ledger" verbs were removed because they implied state the pantry doesn't track.

**Road B** would make the pantry a **notebook/ledger** — the book's "alchemist's pantry"
made literal: a saved quantity you draw down as you cook, notes-to-future-self, and tags for
provenance ("from the Brooklyn care package") and use ("went into the shallot pesto"). This is
the richest, most on-brand expression of the book's philosophy, but it's a real feature arc
(and likely needs accounts/sync, since persistence is currently per-device localStorage).

**Freemium framing (promising, but a destination — not the next step).** Split by *purpose,
not quality*:
- **Free = teaching aid.** The current honest, complete app — the book's companion, the
  in-book/SEO discovery surface. Stays genuinely whole (Road A keeps it so), never crippled.
- **Paid = the practice tool.** Road B's notebook-pantry for committed users who want to *run*
  their kitchen this way, not just learn the philosophy.

Why this is the right *shape* if monetizing ever happens: it doesn't paywall content (which
would cannibalize the app's job as book marketing); it splits on commitment level, so the free
tier isn't a hobbled version of the paid one — they're different jobs.

**Sequencing (important):**
1. Road A — done. The free app is honest today.
2. Build Road B's notebook features **free first**, as validation: watch whether engaged users
   actually maintain quantities/notes before charging for the behavior.
3. Only if it proves sticky: consider the paid split — at which point accounts/sync and the
   commerce layer get their own real planning (a business, not a feature). Don't build payment
   infra on faith; let observed behavior earn it.

The trap to avoid (and the thing Road A fixed): ledger *vocabulary* on a list. Don't reintroduce
"use some / in rotation"-style actions unless Road B gives them real state to act on.

### Content scope — book-bound vs broad coverage (a foundational decision)

How much should the app cover: only the ingredients, substitutions, safety rules, and templates
*from the book* (current state), or expand toward most/all common ingredients regardless of the
book? This shapes what the app fundamentally *is*, and it dovetails with the Road A/B + freemium
fork above.

**Stay book-bound (current).**
- *Pros:* one coherent authorial voice; a faithful book companion; every safety/shelf-life claim
  is vetted and defensible; bounded, maintainable, QA-tractable; differentiates on *philosophy*
  (substitute by role, trust your senses) rather than coverage — which is the book's whole thesis.
- *Cons:* dead ends when a user's ingredient isn't covered (small trust erosion each time); can
  feel like a demo/sampler rather than a daily tool; caps standalone value and SEO/discovery reach.

**Expand to broad coverage.**
- *Pros:* becomes a genuine daily-use tool ("whatever's in my kitchen, it has something"); far
  more sticky (the stickiness that would justify a paid tier); fewer dead ends; bigger reach and
  more entry points for non-readers; room for the Road B notebook to grow without "not in the
  book" walls.
- *Cons:* **voice dilutes** the moment most content isn't the author's; **safety liability scales
  fast** — making vetted-quality shelf-life/preservation/allergen claims about ingredients the
  author never covered is a real-world harm risk, not a UX nit (generic sourcing needs serious
  verification + disclaimers; QA can't meaningfully cover hundreds of entries); maintenance/staleness
  burden; **philosophical tension** — a big lookup table contradicts the book's "you don't need a
  database, you need intuition"; and it's really a *different product* (a general cooking utility),
  i.e. a strategic pivot, not a feature.

**Middle path worth considering.** Stay curated for everything that carries **risk or voice**
(safety, storage times, the signature substitutions, templates), but expand the **low-risk,
high-coverage input surface**: let the substitute-by-role engine accept *more ingredient inputs*
and reason by **category** ("you have bok choy → hearty green → treat it like kale here") without
asserting specific shelf-lives or safety claims for everything. This widens usefulness cheaply and
safely, and it *reinforces* the role-not-name philosophy (teaching the method on a broader input
set) rather than contradicting it with a database.

**How it maps to the freemium fork:** curated = the free teaching aid; broader coverage = part
of what could make a paid "real tool" tier worth paying for. So this may not be either/or forever —
curated free, broader paid — but the *next* version's scope is the thing to decide. Whatever the
choice: never let broad coverage water down the vetted safety content or the authorial voice that
make the app distinct.

**Competitive landscape (checked June 2026).** The "cook with what you have" space is *saturated*
with pantry-tracker + recipe-matcher apps — SuperCook, KitchenPal, Cooklist, SideChef, Food Simp,
CooKing, Crumb, Yummy Pantry, and more. They cluster on one model: log your inventory (barcode/
photo/voice), match against a big recipe database, surface "recipes you can make now," track expiry,
build grocery lists; several add AI recipe generation + dietary filters. Their pitch is uniformly
"reduce food waste / save money / what's for dinner."

**But none of them are doing what this app does.** The category is *recipe delivery*; this app is
*method* — templates, substitute-by-role, the four flavor builders, scraps→second-life, in one
author's vetted voice tied to a book. No direct competitor was found for that premise. Implications:
- The saturated recipe-matcher field is a strong argument **against** expanding toward broad
  ingredient coverage / recipe-style output — that's competing head-on with established, funded apps
  on *their* turf, and it would erode the very thing that makes this app distinct.
- Differentiation lives in the **curated, voice-led, method-over-recipes** identity → argues for
  staying book-bound and leaning *harder* into "this is not a recipe app" (already the Home line).
- Main near-term risk isn't duplication, it's **positioning confusion**: a browser may lump it in
  with SuperCook et al. and expect a recipe matcher. Worth making the "method, not recipes" framing
  unmistakable in store copy / first-run.
