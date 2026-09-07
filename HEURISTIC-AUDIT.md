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

## Full UX audit — September 2026 (current build)

A fresh end-to-end pass over the app as it ships from `main` today (commit `66e40e1`,
the GitHub Pages build). It supersedes the per-heuristic line items below wherever the
two disagree; those sections are kept as the record of what was fixed earlier.

**Method.** Read every component in `scrap-alchemy.jsx`; built the site with
`npm run build`; drove the production build headlessly in Chromium at an iPhone
14 viewport (390×844, 2×, touch) through every tab, modal, empty state, filter,
undo strip, the full build-a-recipe → save → share → prompt loop, Largest text, dark
theme, a simulated day-10 install (monthly card), and a 1280px desktop pass; took
71 screenshots; measured header/nav height, tap-target sizes, sub-12px text,
horizontal overflow, console errors, external requests, and WCAG contrast for every
token pair in both themes. QA harness: 1638/1638 green on the audited commit.

**Caveats.** Google Fonts was unreachable from the audit sandbox, so screenshots
rendered in fallback faces (metrics that depend on Spectral / Source Sans 3 widths are
approximate). Nothing below was verified on a physical iPhone; the "verify on the
phone" list at the end of this section says what to check there.

**Headline.** The app is in good shape: no horizontal overflow on any screen, no
console errors, one external request (fonts), dark theme at full parity, every
zero-result state has a way forward, and the Linen system is applied consistently.
The findings cluster in four places: a real CSS bug that blanks chips after a tap on
iOS, a marketing prompt that makes a promise the app can't keep, urgency colour that
reads backwards, and a phone layout that spends a third of every screen on the
header. Everything else is polish.

### 🔴 High

✔️ **Resolved — H1 — Tappable chips went blank after a tap (sticky hover on iOS).** Eight chip
buttons pair `hover:text-[var(--surface)]` with an inline
`style={{ backgroundColor: "var(--surface)" }}`. The inline style beats the
`hover:bg-[var(--accent)]` class, so while the element is in `:hover` the label is
white on white. iOS Safari keeps `:hover` on the last-tapped element until the next
tap, and the headless run reproduced it: in the Lemon deep-dive, "Apple cider vinegar"
rendered as an empty box (computed colour `rgb(255,255,255)` on `rgb(255,255,255)`).
Sites: use-up callout chips `scrap-alchemy.jsx:2562`, past-prime suggestion chips
`:2902`, Builder closest-match `:3434`, Substitutions closest-match `:4983`, tip
amounts `:5907`, Gift button `:5933`, deep-dive substitutes `:6608`, "Featured in"
`:6630`. *Fix:* drop the inline background on these eight and use the
`bg-[var(--surface)]` class (the escaped-class safety rule in the app's `<style>`
already guarantees the `var()` classes resolve), or set the hover background inline
via a `data-` state. A QA source scan for "hover:text-surface + inline surface bg" would
keep it from coming back.

✔️ **Resolved — H2 — The newsletter prompt promised an email that would never arrive.** After the
user's first scrapbook save (`nextEarnedPrompt`, `:4111`: `scrapbookEntries >= 1`), a
modal opens 1.5 s after the template closes offering "One template a month, free". The
form only writes the address to the user's own localStorage (`NewsletterForm`, `:7320`,
per the code comment), then says "Welcome to the newsletter! First template arrives in
your inbox soon." The review and tip actions were already gated behind
`EXTERNAL_LINKS` for exactly this reason; the newsletter wasn't. It also fires on the
very first save, which is the moment the app has just earned a little trust. *Fix:* add a
`newsletterEndpoint` to `EXTERNAL_LINKS`, hold the prompt while it's null (same
pattern as `amazonReview`), and raise the first-fire threshold (e.g. second save or
day 3). Screenshot: `35-after-save-prompt`.

✔️ **Resolved — H3 — Carried-in ingredients could land in the wrong slot.** Tap Chicken, Potatoes,
Onion in the Builder, open Anytime Hash: the "From your kitchen" panel reads
"Chicken → The Fat" and auto-selects "Chicken fat (schmaltz)"; the Protein slot stays
empty even though it lists "Pulled chicken". `computeInitialPicksFromIngredients`
(`:3910`) takes the first slot whose option *name* contains the word, and the Fat slot
comes before Protein. Any word that appears in several slots' option names (garlic,
shallot, lemon) is exposed to the same ordering luck. *Fix:* consult
`bestSlotForIngredient` / `SLOT_ROLE_HINTS` first and fall back to the substring scan;
add a harness case ("Chicken" → `protein` in Anytime Hash, never `fat`). Screenshot:
`25-template-modal-builder`.

✔️ **Resolved — H4 — Urgency colour was inverted.** "Past its prime" (the most urgent state) is set
in the calm sage accent, while "Use today" / "1 day left" are terracotta, in both the
Pantry list (`accentColor`, `:2657`: `danger → var(--accent)`) and the Home use-soon
card (`:6809`: `sortKey < 0 → var(--accent)`). On Home the two sit on adjacent rows,
so green = worst, orange = less bad. The card *tint* does escalate (surface-alert), so
the text colour contradicts its own background. *Fix:* past → `--spark-text` (or a
dedicated `--danger-text` token), use-soon/warn → a mid tone (ink or a lighter
terracotta). Screenshots: `16-pantry-demo`, `21-home-established`.

All four High items were fixed in the follow-up commit on this branch; see the
changelog entry "High fixes" below. M1, M2, M6 and M7 followed in the next commit
("Header, tab row, tap targets" below), then M3 and M4 ("Builder results and the Home
hand-off" below), then M5, M9, M11, M12 and M14 ("Deletion, modals, custom items,
countdowns, storage" below). The remaining Medium items are copy (M8, M10, M13).

### 🟠 Medium

✔️ **Resolved — M1 — The header spent a third of every phone screen.** Header 218 px + sticky nav
62 px = 280 px before content on an 844 px viewport (33%); at Largest text the header
grows to 280 px and the eyebrow wraps to three lines (350 px, 41%). The eyebrow,
title and subtitle are marketing copy the reader has seen once; they repeat on all
eight tabs. (Listed earlier as low; the numbers argue for medium.) *Fix:* a compact
header on inner tabs (title only, ~90 px) or collapse the subtitle after the first
session; keep the full header on Home.

✔️ **Resolved — M2 — The tab row showed three of eight tabs and clipped words.** The scrolling row
needs 1105 px in a 324 px track. The leftmost visible tab is cut mid-word behind a
24 px fade ("eal Builder", "tions", "apbook"), which reads as a rendering glitch rather
than an affordance, and the right-hand fade paints over the *active* tab when it is
last in view (`04-templates`). On a 1280 px desktop the row still overflows the 896 px
container with the scrollbar hidden, so mouse users have no visible way to reach
Storage or Support. *Fix:* shorter labels on phone ("Builder", "Pantry", "Storage",
"Scrapbook", "Subs"), icon-only for inactive tabs under 400 px, fade width ≥ 2.5 rem
and never over the active tab; let the row wrap to two lines at ≥ 900 px.

✔️ **Resolved — M3 — Builder results appeared far below the fold with no signal.** With a stocked
pantry the "From your pantry" block pushes the ingredient categories ~900 px down; after
tapping ingredients, "What you can build" sits ~1500 px further down and nothing tells
the user matches updated (`23-builder-selected-full`, 4910 px tall). *Fix:* a slim
pinned bar under the nav once anything is selected ("On hand 3 · 5 templates fit ↓"),
or render matches directly under the "On hand" strip; collapse the pantry block to one
row of chips with "show all" when it has more than four.

✔️ **Resolved — M4 — The Home → Builder hand-off lost the promise.** Home says "7 templates fit what
you have" (`unlockedTemplates`, `:6758`, counted via `templatesForScraps`), but "Build a
meal" lands on the Builder with nothing selected, and the Builder's own matcher
(`matchTemplates` over `SCRAP_TAGS`) would give a different number anyway. Two
derivations of "what fits" is the pattern the architecture rules warn about. *Fix:* on
that route, pre-select the usable pantry scraps (so the count is realised on arrival),
and compute the Home count with the same matcher.

✔️ **Resolved — M5 — Two deletion patterns, three controls for one action.** Pantry removal uses
the inline 7-second undo strip (good). A scrapbook entry uses "Tap again to delete"
with no undo, and deleting closes the modal (`ScrapbookEntryModal`, `:6363`). On a pantry
card, the trash icon, "Used it up" and "Discarded" all call the same `requestRemove`,
and the strip always says "Removed", so the verb the user chose is thrown away. *Fix:*
give the scrapbook list the same undo strip; either drop the trash icon or make the strip
echo the verb ("Used up Garlic confit — Undo").

✔️ **Resolved — M6 — Tap targets were under 44 px on the primary actions.** Measured on the phone
viewport: "Used it up" / "Discarded" 16 px tall, status chip 18 px, footer links 16 px,
"Share Scrap Alchemy" 16 px, template chips 26 px, "clear" links ~16 px, tab-order
arrows 24–28 px, banner dismiss 24 px, modal Close 20 px, trash 16 px, header buttons
36 px. 57 sub-44 px controls on the demo Pantry alone. *Fix:* keep the visual size,
add padding / `min-height: 44px` hit areas (negative margins keep the layout).

✔️ **Resolved — M7 — Text below 11 px, and two arbitrary Tailwind sizes.** Builder chip status
suffix is `text-[10px]` (`:3385`); the combo "Customize" control is 0.55 rem ≈ 8.8 px
(`:4814`); the Dropdown panel label is `text-[0.6rem]` (`:5605`). CLAUDE.md notes
arbitrary values don't compile in the artifact sandbox, so those two labels render at
different sizes in the artifact and on the site. *Fix:* inline `fontSize` ≥ 11 px.

**M8 — Support tab copy assumes cards that aren't there.** With no links configured
(the shipped state), the intro says "here are a few ways to give back", then the only
element is a dashed box starting "Or just tell a friend…". *Fix:* when zero cards
render, swap the intro to something like "The best way to support the book is to tell
someone about it." and drop the leading "Or". Proposed copy, for the author's edit.

✔️ **Resolved — M9 — Full-height modals used `100vh`.** Every modal is `max-h-screen` with
`items-stretch` on phones. On iOS Safari `100vh` is taller than the visible viewport, so
the bottom of a tall modal (Save to scrapbook, Build my recipe, Save to pantry) can sit
under the toolbar and the last rows of the inner scroll may be unreachable. *Fix:*
`max-h-dvh` (Tailwind 3.4) with `max-h-screen` as the fallback, and/or a sticky action
row at the bottom of the scroll region. Needs a device check.

**M10 — The book is never named; the app is credited as the cookbook.** The share
message reads "a great cookbook — Scrap Alchemy by mg frank" (`:7133`), the native
recipe share says "from Scrap Alchemy by mg frank" (`:6261`), and each Story ends "— from
Scrap Alchemy" while its eyebrow cites a chapter of the book (`:3847`). The string
"The Alchemist's Scrapbook" does not occur anywhere in the jsx. For an app whose job is
book marketing, outward-facing text should carry the book's title. *Fix:* name the book
in the share text, the story attribution, and the Support intro. Copy for the author.

✔️ **Resolved — M11 — "Save as a custom item" only appeared at zero results.** In Add a scrap, the
custom path (`:3029`) is offered only when the search matches nothing. A query that
partially matches a preset ("garlic" → Raw Infused Oil, Confit Garlic) has no way to
save "garlic scapes" without retyping something the list doesn't match. *Fix:* always
append a "Save “q” as a custom item" row under a filtered list when there's no exact
name match.

✔️ **Resolved — M12 — Short-lived types were born in warning colour.** Cooked meat (cautious end
3 days) shows "3 days left" in terracotta the day it is added (`formatDaysLeft`: days ≤ 3
→ warn). Every leftover is orange on day 0, so the colour carries no information for
that category. *Fix:* warn at `min(3, ceil(shortDays / 2))` days, or only at ≤ 1 day for
types whose short end is ≤ 4 days.

**M13 — First Home screen says "not a recipe app" three times and offers the Builder
twice.** Eyebrow + Day-1 card ("This isn't a recipe app. It's a working kitchen…") + How
this works intro (the same sentence). CTAs: "Try the meal builder" (card) and "Build a
meal" (guide), while step 1 of the guide is "Stock your pantry" (already parked). Copy
proposals: keep the line in one place (the guide), make the Day-1 card the book's voice
instead of the app's pitch, and point the guide CTA at the pantry to match its own step 1.

✔️ **Resolved — M14 — Storage & Safety led with the temperature table; search was below the
fold.** The tab most likely to be opened in a hurry ("is this still good?") puts search
at ~1550 px, under a 600 px temperature card, on a 4557 px page. *Fix:* search + category
filter first, temperatures as a collapsed card ("Safe internal temperatures ›").

### 🟢 Low / polish

- **L1 — Theme button.** Shows the current state, not the action; "Auto" is a desktop
  monitor icon on a phone; three-state cycle with no label. Settings already has a
  labelled control; consider dropping the header toggle.
- **L2 — Mixed icon systems.** Emoji and text glyphs beside lucide icons: ✨ Load demo
  pantry, 📖, ☕, ★, ⓘ (Builder info buttons), ◦ bullets. Emoji render differently per OS.
- **L3 — Search inputs.** Substitutions uses a raw `<input>` rather than the shared
  `SearchInput` (`:4963`), so it has no clear ×. No search field sets `type="search"`,
  `enterKeyHint="search"` or `autoCapitalize="none"`, so iOS capitalises the first letter
  and offers a "return" key.
- **L4 — Dropdown labels truncate** at 390 px ("USE SOON…", "PAST PRI…"). Shorter
  option labels ("Soonest", "Past prime (2)") or drop the "Show" prefix.
- **L5 — Template modal mode tabs wrap** ("BUILD / MINE") at 390 px. "Build" alone, or
  less tracking.
- **L6 — Duplicate quantities on the recipe and share cards.** "1–2 cloves 1–2 garlic
  cloves", "2 Tbsp 2 Tbsp fried shallots": fifteen option names begin with an amount and
  also carry `overrideAmount` (`:406–410` and others). Strip the leading amount from the
  name when an override exists, or name options without amounts. Visible on the
  shareable PNG, so worth fixing before the share feature gets used.
- **L7 — Build-mine length on a phone.** Anytime Hash is 8 slots × 5–7 full-width option
  cards ≈ 4000 px of modal; "Pick 4 more" sits at the very bottom and doesn't say which.
  Two-column compact options under 640 px and a pinned "4 of 8 chosen" line (or sticky
  Build button) would help.
- **L8 — Demo pantry has no "demo" marker.** Ten realistic jars land in the user's real
  pantry with no way to tell them apart later except "Clear pantry" at the bottom. Tag
  them (`demo: true`, small "sample" label) and offer "Remove sample items".
- **L9 — Accessibility basics.** Modals have no `role="dialog"` / `aria-modal`, no focus
  trap, no Escape-to-close, no focus return; nine controls set `outline-none`; headings
  skip from h1 to h3; no `prefers-reduced-motion`. Keyboard focus shows the browser's
  default ring (visible, unthemed). Low on a phone; the site is also public on desktop.
- **L10 — Font loading.** Google Fonts is pulled by a CSS `@import` inside a `<style>`
  rendered by React (`:8047`), so the request starts only after the bundle runs; if it
  fails everything falls back silently. Move to `<link rel="preconnect">` + `<link>` in
  `index.html`, or self-host the three faces on DreamHost.
- **L11 — Copy drift.** Welcome day 5 says "The seven templates in this book" (`:2097`);
  the app ships nine.
- **L12 — Contrast (light theme).** `--moss` on white is 3.45:1 and is used for the
  "ok" countdown text ("~4 weeks left") at 12–13 px, below AA for small text;
  `--spark-text` on `--surface-warm` is 4.03:1 (the italic use-soon note on warm cards).
  Everything else passes; the dark theme passes throughout. Use `--accent` (5.21:1) for
  the ok tone and darken `--spark-text` ~5%.
- **L13 — Duplicate suggestions under the Past-prime filter.** The "Put them to use"
  callout lists the same template chips that every card beneath it repeats in "If your
  senses say yes".
- **L14 — After "Add", the new item may be off-screen.** The list is sorted by use-soonest,
  so a long-dated item lands at the bottom under a toast that says only "Added…". Scroll
  to it or flash its card.
- **L15 — Redundant entry points.** Settings is in the header and the footer; Support is
  a tab and a footer link. Fine, but the footer could be Share alone once the header is
  compacted (M1).

### ✅ Strengths worth protecting

- Linen system applied consistently; dark theme is a real design, not an inversion.
- Inline undo at the tap location (pantry), status provenance on tap, honest empty
  states, and a forward path on every zero-result search.
- `enrichScrap` as the single source of pantry status: the same wording on Pantry,
  Builder chips and Home (verified).
- No horizontal overflow on any screen at 390 px, including Largest text; no console
  errors; the only network request beyond the site is fonts.
- The book's voice carries through prose, hints and safety notes; safety text is
  intact and prominent (botulism warning, reheat temperatures, "when in doubt").
- A 1638-assertion harness that catches referential drift between templates,
  storage cards and deep-dives.

### Recommended order

1. H1 (eight one-line class changes + a QA scan) — visible on the author's own phone.
2. H2 (gate the newsletter like the review link; raise the threshold).
3. H4 (urgency colour) and L12 (moss → accent) together, one token pass.
4. H3 (slot mapping) with a harness case.
5. M6 + M7 (hit areas, minimum text size) — one CSS pass.
6. M1 + M2 (compact inner-tab header, shorter tab labels).
7. M3 + M4 (Builder results visibility, Home → Builder hand-off).
8. M8 + M10 + M13 + L11 copy — proposed wording above, for the author to edit.
9. M9 (`dvh`) after a device check.
10. The rest opportunistically.

### Verify on the phone (iPhone, Safari and Home-screen app)

- **H1:** Pantry → Load demo pantry → on "Garlic confit" tap the "Pantry Pasta" chip →
  close the template. Expected today: the chip's label has vanished (white on white)
  until you tap elsewhere. Same for a deep-dive's "If you don't have it" chips.
- **H4:** Home with the demo pantry: "past its prime" rows are green, "1 day left" is
  orange.
- **M9:** Scrapbook → Save a discovery → scroll the form to the bottom. Check the Save
  button clears the Safari toolbar; repeat in the Home-screen app.
- **M1:** On My Pantry, note how much of the first screen is header before the title.
- **M2:** Swipe the tab row slowly; watch the left edge of the first visible tab and the
  right edge of an active last tab.
- **M3:** Builder with the demo pantry: tap Chicken; is there any sign that results
  changed below?
- **H3:** Builder → Chicken, Potatoes, Onion → Anytime Hash: "Chicken → The Fat".
- **Share card:** Improvised Pesto → Build mine → Build → Save → Share this recipe →
  check the "1–2 cloves 1–2 garlic cloves" line, then try Download PNG in the Home-screen
  app (downloads from standalone mode are unreliable on iOS; native Share is the path).

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
(garlic, fresh herbs)") and some broad ("Relishes & Sauces"). Fine; the breadth gap no
longer leaves a card actionless — the Relishes & Sauces storage card now links to The
Alchemist's Meal as its generic "use it up" path. **(Naming mix itself: accepted.)**

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

✔️ **Resolved — zero-result searches now offer a forward path.** Every search surface
suggests the closest real item ("did you mean", via the pure `closestMatches`), routes to
relevant content (Subs → ingredient deep-dive), or offers the next action (Pantry → add the
item; Builder → select the suggestion or go save it). (Was: "no match" with nothing to do.)

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

✔️ **Resolved — "Relishes & Sauces" storage card now links to The Alchemist's Meal** as the
generic "use it up" path (its Flavor part literally calls for "a spoonful of savory relish").
QA now sweeps the real STORAGE_GUIDE: every card must resolve to a dive or template.

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

## Still open

Superseded by the **Full UX audit — September 2026** section at the top of this file,
which carries the current High / Medium / Low lists and the recommended order. Of the
three items previously listed here: the tall header is now M1 (with measurements);
bulk actions (#7) and the dashed-border signal (#4) remain 🟢 and are folded into the
polish list's spirit (no change of status).

---

## Changelog — full UX audit (September 2026)

- **Audit only, no app changes.** Added the "Full UX audit — September 2026" section:
  4 High / 14 Medium / 15 Low findings with file:line references, a recommended order,
  and a verify-on-the-phone list. Method: code read + headless iPhone-size walkthrough
  of the production build (71 screenshots, tap-target / text-size / overflow / contrast
  measurements). QA harness unchanged at 1638 green. The "Still open" list now points at
  the new section.

## Changelog — Deletion, modals, custom items, countdowns, storage (September 2026 audit, items M5/M9/M11/M12/M14)

- **M5 — one deletion pattern, three honest verbs.** Deleting a scrapbook entry now
  closes the modal and leaves a "Deleted <title> — Undo" strip where the card was
  (7 s), the same pattern as the pantry; "Tap again to delete" is gone. On a pantry
  card the three finishing actions keep their distinct meanings and the strip now
  echoes the one chosen: "Used up …", "Discarded …", or "Removed …" (the trash icon,
  relabelled "Remove from the list", is for entries added by mistake).
- **M9 — modal sheets capped at the dynamic viewport.** All eight sheets (and the
  Settings panel) use one `.modal-sheet` rule: `max-height: 100vh` with a `100dvh`
  override where supported (90vh/90dvh from `sm` up), so on iOS Safari the Save /
  Build row can't sit under the toolbar. Belt-and-braces: the `fixed inset-0`
  backdrop already tracks the layout viewport on iOS 15+; still worth the phone check.
- **M11 — custom items reachable beside partial matches.** In Add a scrap, once two
  or more characters are typed and no preset has exactly that name, a dashed "Save
  “…” as a custom item" row sits at the top of the filtered list ("garlic scapes" no
  longer has to dodge the two garlic presets). The zero-result path is unchanged.
- **M12 — warn threshold scales with the type.** `formatDaysLeft` takes the type's
  cautious shelf life and warns inside the last 3 days but never for more than half
  the range (`max(1, min(3, ceil(short / 2)))`): cooked meat added today reads
  "3 days left" in the healthy tone and turns terracotta at 2 days; 1 day and "Use
  today" are always warn; anything with a 6+-day range keeps the 3-day threshold.
  `enrichScrap` remains its only caller. The Home use-soon card follows (day-zero
  leftovers no longer "need soon").
- **M14 — search first on Storage & Safety.** The search field and category filter
  now come before the temperature card; the card stays fully visible at rest and
  steps aside only while a query or category filter is active. Safety copy unchanged
  (QA checks the two sentences verbatim).
- QA harness 1674 → 1695: warn-threshold cases through both `formatDaysLeft` and
  `enrichScrap`, plus source invariants for each of the five items. esbuild + Vite
  build verified; all five checked headlessly.
- **Verify on the phone:** Pantry → add Cooked Meat or Poultry dated today — "3 days
  left" is sage, not orange; tap "Used it up" — the strip says "Used up …"; Scrapbook →
  open an entry → Delete entry — the modal closes and the card becomes a "Deleted …
  — Undo" strip; Add a scrap → type "garlic" — a dashed "Save “garlic” as a custom
  item" row sits above the two presets; Storage — the search field is the first
  control, type "bacon" and the temperature table steps aside; Save a discovery →
  scroll the form to the bottom — the Save button clears the Safari toolbar.

## Changelog — Builder results and the Home hand-off (September 2026 audit, items M3/M4)

- **M4 — one count, one derivation.** New pure `scrapMatcherTags` +
  `buildableTemplatesForScraps` (the Builder's own matcher over the pantry's
  `SCRAP_TAGS`) now drive the Home card's "N templates fit what you have"; the
  Builder's matcher input uses the same helper. The card counts the same items the
  Builder shows (past-prime dropped, custom kept). Tapping the card hands those
  pantry ids to the Builder, which mounts with them selected, so the promised
  templates are on screen on arrival; opening the Builder from the tab row still
  starts clean. QA §30: the Home count equals the Builder's anchored matches for
  the same scraps, tagless or custom-only pantries count 0, and a source check that
  Home no longer counts via `templatesForScraps`.
- **M3 — results within reach.** The "From your pantry" block shows the four most
  urgent items (plus anything selected) with "Show N more" / "Show fewer"; with the
  demo pantry that trims ~120 px of chips from above the ingredient grid. Once
  anything is selected, a one-line tally sits under the search field ("3 on hand ·
  5 templates fit · See them ↓") and jumps the page to "What you can build" (page
  scroll set directly, not `scrollIntoView`). The tally uses the Builder's live
  matches, so it can never disagree with the results below it.
- QA harness 1666 → 1674; esbuild + Vite build verified; hand-off, collapse, tally
  and jump checked headlessly.
- **Verify on the phone:** Home with the demo pantry → note the number on "What can
  you make?" → tap it: the Builder opens with the pantry chips already selected and
  the tally line shows the same number; tap "See them" — the page scrolls to the
  results; Builder from the tab row — nothing pre-selected, pantry block shows four
  chips and "Show 4 more".

## Changelog — Header, tab row, tap targets (September 2026 audit, items M1/M2/M6/M7)

- **M1 — compact header on inner tabs.** Home keeps the full masthead (eyebrow,
  title, subtitle). Every other tab shows a one-line title beside the Theme and
  Settings buttons: header 218 → 70 px on a 390 px phone (350 → 70 at Largest text),
  so content now starts ~150 px higher on seven of eight tabs. Same on desktop.
- **M2 — tab row.** New `TAB_SHORT_LABELS` used by the nav only, under the `sm`
  breakpoint: Builder · Pantry · Templates · Scrapbook · Swaps · Storage · Support
  (row 1105 → 879 px; four tabs visible instead of three). **Copy for the author:**
  "Swaps" for Substitutions is a proposal — it echoes the tab's own gloss ("swap for
  the role, not the name"); "Subs" is the alternative. Settings and the Home guide
  still use the full labels. Swipes now snap to tab boundaries with 40 px padding so
  the row never rests mid-word; fades are 40 px and the active tab is kept clear of
  them when it scrolls into view. At `sm` and up the row wraps instead of scrolling,
  so on desktop all eight tabs are visible (two rows, no hidden scrollbar).
- **M6 — hit areas.** Two utilities in the app's `<style>`: `.tap` (invisible
  pseudo-element, +14 px vertical / +8 px horizontal) on 40-odd sparse text links and
  icon buttons (Used it up / Discarded / Learn more / Undo / clear / footer links /
  status chip / trash / modal Close / App guide / Customize…), `.tap-sm` (+5 px) on
  chips packed in rows. Header buttons 36 → 44 px, batch stepper 32 → 40, tab-order
  arrows 24–28 → 36 (+10), dropdown rows and search fields taller, template-modal
  mode tabs on one line. Demo-pantry controls under 44 px: 57 → 7, all of them now
  40–42 px (dropdown triggers and template chips).
- **M7 — minimum text size.** Builder chip status suffix 10 → 11 px; the "Customize"
  control 8.8 → 11.2 px; the dropdown panel label uses `text-xs`. No Tailwind
  arbitrary text-size classes remain (they don't compile in the artifact sandbox).
- QA harness 1656 → 1666: source scans for the arbitrary classes, sub-11 px inline
  sizes, the hit-area utilities (defined, used, never on an absolutely positioned
  element), the compact-header branch, `TAB_SHORT_LABELS` coverage and length, and
  the fade-clearance scroll rule. esbuild + Vite build verified; measured headlessly
  before/after (see numbers above).
- **Verify on the phone:** any inner tab — the title sits on one line beside the
  two buttons and content starts right under the tab row; swipe the tab row and let
  go — it settles on a whole tab; on the Pantry, tap just above or below "Used it up"
  — it should still fire; Templates → any template — the three mode tabs sit on one
  line; Settings → Tab order — the arrows are easier to hit.

## Changelog — High fixes from the September 2026 audit

- **H1 — chips no longer blank after a tap.** The eight outlined accent chips that
  filled on hover now use one shared `.chip-invert` class instead of Tailwind
  `hover:bg/hover:text` pairs that lost to their inline surface background. The fill
  is scoped to `@media (hover: hover)` (pointer devices), with `:active` press
  feedback everywhere, so iOS sticky `:hover` can't strand a white-on-white label.
  QA §28 scans the source so the pattern can't return.
- **H2 — newsletter prompt gated on a real endpoint.** New
  `EXTERNAL_LINKS.newsletterEndpoint` (null = the prompt never fires, mirroring the
  review-link gate). `nextEarnedPrompt` takes `{ newsletter: false }` and then skips
  the newsletter and lets the review fire on its own thresholds. When configured,
  `NewsletterForm` POSTs `{ email }` to the endpoint (409 = already subscribed); the
  local-storage save is now only a fallback. **Threshold change for the author to
  confirm:** the newsletter now waits for the *second* save or build (or one pantry
  item plus three days) instead of the first save.
- **H3 — carried-in ingredients follow their role.** `computeInitialPicksFromIngredients`
  now decides each ingredient's slot first, preferring the slot its role hint names
  (`bestSlotForIngredient`) when several slots list the word; document order only
  breaks ties the hints don't cover. Chicken → The Protein, not The Fat. QA §27 adds
  the Hash case plus a sweep over every builder × Builder-tab ingredient (role-hinted
  slot wins wherever it lists the ingredient; nothing named by a slot is dropped).
- **H4 — urgency colour escalates with the card.** Past prime → `--spark-deep`
  (4.94:1 on the alert tint, light), use-soon/warn → `--spark-text`, healthy →
  `--accent` (was `--moss`, 3.45:1). Same mapping on the Pantry list, the Home
  use-soon card, and the Builder chips (also closes L12's moss finding).
- QA harness 1638 → 1656, all green; esbuild + Vite build verified; the four
  fixes re-checked headlessly (chip colours after a tap, hover fill on a pointer
  device, Hash slot mapping, Home/Pantry colours, no prompt after two saves with
  the endpoint unset).

## Changelog — Home Screen icon (July 2026)

- **Home Screen icon added** (wrapper-only change; no jsx, storage, or display-mode
  edits). New alembic-flask mark, paper-white line art with a terracotta drop on the
  Linen sage ground: `public/apple-touch-icon.png` (180px) + `icon-192/512.png` for
  future use, linked from `index.html`; the emoji tab favicon swapped for the same
  artwork (`public/favicon.svg`). iOS previously showed a letter-"S" tile because no
  apple-touch-icon existed. Existing Home Screen installs keep their old tile and
  their data; re-adding shows the flask.

## Changelog — quick-wins session (July 2026)

- **External links centralized + honest Support tab.** New `EXTERNAL_LINKS` config at the
  top of the jsx (author fills in real URLs; null = hidden). The Support tab's Review /
  Tip / Gift cards now render only when their link is configured — the stub tip jar
  (example.com), generic Amazon review URL, and placeholder ASIN no longer ship as live
  buttons. The earned review prompt is held until the review link exists (earn conditions
  persist, so it fires once configured); ShareAppModal reads the app URL from the config.
  Copy proposed for author review: Support intro "three ways" → "a few ways"; Home guide
  Support note → "share or support the book". QA: `isConfiguredLink` / `tipAmounts`
  invariants + source-level scans so the placeholder URLs can never reappear.
- **Zero-result search guidance (#5, the last Medium).** Every search surface now offers a
  forward path on no-match: Builder and Storage suggest the closest real item via new pure
  `closestMatches` / `editDistance` (typo/plural tolerant, silent under 3 chars and on
  gibberish); Substitutions — previously a silently empty grid — explains role-based
  substitution, offers "did you mean" chips, and deep-links a matching ingredient dive;
  Pantry offers "Add “q” to your pantry" (pre-fills the Add modal via a new optional
  `initialTypeQuery` prop); Scrapbook gains the same Clear affordance as Pantry.
- **"Walkthrough coming soon" dead end removed.** TemplateModal's framework fallback now
  shows the template's tagline + blurb with one-tap routes to Build mine / Story when they
  exist. All 9 templates currently have walkthroughs, so the state is latent — QA now
  enforces template-name referential integrity (TEMPLATES ↔ TEMPLATE_DETAILS ↔ storage
  cards ↔ use-up suggestions ↔ deep-dive usedIn), so a future dead end fails the harness
  by name. Content gap for the author: no "Build mine" flow for The Alchemist's Meal and
  Stock from Scraps (possibly intentional). → Draft builders for both were scaffolded in
  a follow-up commit (see below); they are author-editable scaffolds, not final copy.
- **"Build mine" scaffolds drafted for The Alchemist's Meal and Stock from Scraps**
  (follow-up to the gap above; PENDING AUTHOR COPY REVIEW). Slot labels, method steps,
  and most option text are sourced verbatim from the templates' own framework text and
  existing builder entries; safety wording is copied verbatim, never paraphrased. The
  Meal builder deliberately uses qualitative amounts ("The centerpiece", "A dollop") so
  no numeric measurements are invented — the batch stepper is a no-op there by design.
  Invented and flagged: Stock's 8-cup ratio and "About 2 quarts" yield. Known judgment
  calls for the author: the Meal's Temperature slot (moves, not ingredients — delete if
  it feels off) and whether the Meal should have a builder at all. Noted, not changed:
  a saved "Relishes & Sauces" scrap gets "no slot here" in the Meal builder (adding a
  relish rule to SCRAP_KEYWORDS would fix it but touches shared routing). QA: new real-
  data sweep over ALL of BUILDER_RECIPES (schema, known-name keys, skip detection,
  carried-in routing, no-option-named-"stock" trap guard); 1203 → 1636 assertions.
- **Relishes & Sauces storage card linked to The Alchemist's Meal** — the one storage card
  with no action. QA §18 now sweeps the real STORAGE_GUIDE (every card resolves).
- QA harness: 1002 → 1203 assertions, all green. esbuild + Vite production build verified.

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
