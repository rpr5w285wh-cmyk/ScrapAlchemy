// Logic QA harness for scrap-alchemy's builder.
// Extracts the PURE functions from the JSX source (no React needed) and asserts on
// them across every state combination. Catches the class of bug we kept hitting:
// chip/footer contradiction, false texture caveats, wrong combo expansion, bad plurals.
//
// Run: node qa-harness.js
const fs = require("fs");
const src = fs.readFileSync(__dirname + "/scrap-alchemy.jsx", "utf8");

// Pull a top-level `function NAME(...) { ... }` out of the source by brace-matching.
// Start counting at the body's opening brace — the first "{" AFTER the parameter
// list's closing ")" — so default-param braces like `existing = {}` don't fool us.
function extract(name) {
  const start = src.indexOf(`function ${name}(`);
  if (start === -1) throw new Error(`fn not found: ${name}`);
  // find the ")" that closes the parameter list (track nested parens)
  let i = src.indexOf("(", start), pd = 0, paramEnd = -1;
  for (; i < src.length; i++) {
    if (src[i] === "(") pd++;
    else if (src[i] === ")") { pd--; if (pd === 0) { paramEnd = i; break; } }
  }
  // body opening brace is the next "{" after the param list
  let bodyStart = src.indexOf("{", paramEnd), depth = 0, end = -1;
  for (i = bodyStart; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  return src.slice(start, end);
}

const NAMES = [
  "isProportionBlend", "isComboName", "comboParts", "partLabel", "isSkipOption", "isValidEmail", "makeId",
  "daysBetween", "formatDaysLeft", "nextEarnedPrompt",
  "normIngredientName", "pickedListFrom", "selectedSlotForLabel",
  "pinnedSlotForLabel", "carriedInState", "carriedInFooter", "textureCaveatFor",
  "normIngredient", "slotHasOption", "bestSlotForIngredient", "computeInjections",
  "computeInitialPicksFromScraps", "computeInitialPicksFromIngredients", "computeInitialPicks",
  "defaultTabOrder", "movableRange", "moveGroup", "moveTabInGroup", "flattenTabOrder", "isValidTabOrder",
  "enrichScrap", "enrichScraps", "templatesForScrapType",
  "isConfiguredLink", "tipAmounts", "editDistance", "closestMatches",
];
// Also need the TEXTURE_CAVEATS / EXCLUSIONS data arrays textureCaveatFor closes over.
function extractConst(name) {
  const start = src.indexOf(`const ${name}`);
  if (start === -1) throw new Error(`const not found: ${name}`);
  let i = src.indexOf("[", start), depth = 0, end = -1;
  for (; i < src.length; i++) {
    if (src[i] === "[") depth++;
    else if (src[i] === "]") { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  return src.slice(start, end + 1); // include trailing ;
}

// Like extractConst, but for object-literal consts (brace-matched instead of
// bracket-matched). Returns just the `{ ... }` literal, ready for eval("(" + s + ")").
function extractObjConst(name) {
  const start = src.indexOf(`const ${name}`);
  if (start === -1) throw new Error(`const not found: ${name}`);
  let i = src.indexOf("{", start), depth = 0, end = -1;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  return src.slice(src.indexOf("{", start), end);
}

const code =
  extractConst("TEXTURE_CAVEATS") + "\n" +
  extractConst("TEXTURE_CAVEAT_EXCLUSIONS") + "\n" +
  extractConst("SCRAP_KEYWORDS") + "\n" +
  extractConst("SLOT_ROLE_HINTS") + "\n" +
  extractConst("TAB_GROUPS") + "\n" +
  extractConst("SCRAP_TYPES") + "\n" +
  NAMES.map(extract).join("\n") + "\n" +
  "module.exports = { " + NAMES.join(", ") + " };";

const mod = {};
new Function("module", code)(mod);
const F = mod.exports;

let pass = 0, fail = 0;
const fails = [];
function check(desc, cond) {
  if (cond) pass++;
  else { fail++; fails.push(desc); }
}

// ---- 1. Combo detection ---------------------------------------------------------
check("Half-blend is NOT a combo", F.isComboName("Half olive + half neutral") === false);
check("Apples trio IS a combo", F.isComboName("Apples + parsnips + carrots") === true);
check("Bay+pepper IS a combo", F.isComboName("Bay leaves + black peppercorns") === true);
check("Onion & garlic IS a combo", F.isComboName("Onion & garlic") === true);
check("Single is not a combo", F.isComboName("Olive oil") === false);
check("'or' option is not a combo", F.isComboName("Duck or chicken fat") === false);

// ---- 2. Combo parts + capitalization --------------------------------------------
check("trio splits to 3", F.comboParts("Apples + parsnips + carrots").length === 3);
check("partLabel capitalizes", F.partLabel("black peppercorns") === "Black peppercorns");

// ---- 3. Texture caveats: per-part, confit-scoped, no false positives ------------
const T = "Confit Project";
check("apple flagged in confit", !!F.textureCaveatFor("Apples", T));
check("carrot NOT flagged", F.textureCaveatFor("Carrots", T) === null);
check("parsnip NOT flagged", F.textureCaveatFor("Parsnips", T) === null);
check("peppercorns NOT flagged (not 'pepper')", F.textureCaveatFor("Black peppercorns", T) === null);
check("cinnamon stick NOT flagged", F.textureCaveatFor("Cinnamon stick", T) === null);
check("potato flagged in confit", !!F.textureCaveatFor("Potatoes", T));
check("cherry tomato flagged", !!F.textureCaveatFor("Cherry tomatoes (whole)", T));
check("no caveat outside confit", F.textureCaveatFor("Apples", "Pantry Pasta") === null);

// ---- 4. Carried-in state machine ------------------------------------------------
const slots = [{ id: "ingredient", label: "The Ingredient" }, { id: "fat", label: "The Fat" }];
const injected = { ingredient: [{ name: "Potatoes" }] };
check("selected when picked",
  F.carriedInState("Potatoes", { ingredient: ["Potatoes"] }, slots, injected) === "selected");
check("availableButOff when pinned but not picked",
  F.carriedInState("Potatoes", { ingredient: [] }, slots, injected) === "availableButOff");
check("noSlot when neither",
  F.carriedInState("Saffron", {}, slots, {}) === "noSlot");
check("curated keyword match counts as selected",
  F.carriedInState("Potatoes", { ingredient: ["Diced cooked potatoes"] }, slots, injected) === "selected");

// ---- 5. THE INVARIANT: chip state and footer never contradict -------------------
// The footer names ingredients grouped by state. For every combination, the footer
// must mention the remove-instruction ONLY if something is selected, the use-
// instruction ONLY if something is off, and the no-slot line ONLY if something has
// no slot. Also: every named ingredient must actually appear in its line.
function footerText(sel, off, no) { return F.carriedInFooter(sel, off, no).join(" "); }
function footerMentions(footer) {
  return {
    selected: /tap to remove/.test(footer),
    off: /tap to use/.test(footer),
    no: /no slot/.test(footer),
  };
}
const namePool = { sel: ["Shallot", "Onion"], off: ["Potatoes", "Garlic"], no: ["Saffron", "Vanilla"] };
for (let nSel = 0; nSel <= 2; nSel++)
  for (let nOff = 0; nOff <= 2; nOff++)
    for (let nNo = 0; nNo <= 2; nNo++) {
      const sel = namePool.sel.slice(0, nSel);
      const off = namePool.off.slice(0, nOff);
      const no = namePool.no.slice(0, nNo);
      const footer = footerText(sel, off, no);
      const m = footerMentions(footer);
      check(`[${nSel},${nOff},${nNo}] remove-line matches`, m.selected === (nSel > 0));
      check(`[${nSel},${nOff},${nNo}] use-line matches`, m.off === (nOff > 0));
      check(`[${nSel},${nOff},${nNo}] no-slot-line matches`, m.no === (nNo > 0));
      // Every named ingredient appears in the footer.
      [...sel, ...off, ...no].forEach(n =>
        check(`[${nSel},${nOff},${nNo}] names ${n}`, footer.includes(n)));
      // Empty state → no lines.
      if (nSel + nOff + nNo === 0)
        check("empty → no footer lines", F.carriedInFooter([], [], []).length === 0);
      // Line count equals number of non-empty states.
      const expectedLines = (nSel > 0) + (nOff > 0) + (nNo > 0);
      check(`[${nSel},${nOff},${nNo}] line count`, F.carriedInFooter(sel, off, no).length === expectedLines);
    }

// ---- 6. Plural agreement spot checks --------------------------------------------
check("1 selected → 'its section'", /its section/.test(footerText(["Shallot"], [], [])));
check("2 selected → 'their sections'", /their sections/.test(footerText(["Shallot", "Onion"], [], [])));
check("1 off → 'its section'", /waiting in its section/.test(footerText([], ["Potatoes"], [])));
check("1 noSlot → 'no slot here'", /no slot here/.test(footerText([], [], ["Saffron"])));
check("2 noSlot → 'no slots here'", /no slots here/.test(footerText([], [], ["Saffron", "Vanilla"])));

// ---- 7. Carried-in PLACEMENT: every carried ingredient lands or is flagged ------
// Regression guard for the bug where 3 ingredients into one multi-select slot only
// placed the first and silently dropped the rest, and a curated ingredient looked
// "not an option" because it was neither injected nor auto-picked.
const confit = { slots: [
  { id: "ingredient", label: "The Ingredient", options: [
    { name: "Whole garlic cloves (peeled)" }, { name: "Cherry tomatoes (whole)" },
    { name: "Carrots (large dice)" }, { name: "Shallots (peeled, halved)" },
    { name: "Apples + parsnips + carrots" }, { name: "Chicken thighs (skin-on, bone-in)" },
    { name: "Pork shoulder (cubed)" } ] },
  { id: "fat", label: "The Fat", options: [
    { name: "Neutral oil (canola, sunflower)" }, { name: "Olive oil" },
    { name: "Half olive + half neutral" }, { name: "Duck or chicken fat (rendered)" }, { name: "Pork lard" } ] },
] };

// asArray: a slot pick may be a string or an array; normalize.
const asArr = (v) => v == null ? [] : Array.isArray(v) ? v : [v];

// The key scenario from the bug report.
const picks = F.computeInitialPicks(confit, [], ["Potato", "Carrot", "Shallot"]);
const inj = F.computeInjections(confit, [], ["Potato", "Carrot", "Shallot"]);
const ingPicks = asArr(picks.ingredient).map(s => s.toLowerCase());
check("carrot auto-picked", ingPicks.some(p => p.includes("carrot")));
check("shallot auto-picked", ingPicks.some(p => p.includes("shallot")));
check("potato injected (not curated)", (inj.bySlot.ingredient || []).some(o => /potato/i.test(o.name)));
check("carrot NOT double-injected", !(inj.bySlot.ingredient || []).some(o => /^carrot/i.test(o.name)));
check("shallot NOT double-injected", !(inj.bySlot.ingredient || []).some(o => /^shallot/i.test(o.name)));
check("carrot does NOT auto-pick the apples combo", !ingPicks.some(p => p.includes("apples")));

// INVARIANT: every carried-in ingredient is accounted for — either auto-picked,
// injected into a slot, or in `unplaced`. None silently vanish.
function accountedFor(label, picks, inj) {
  const w = label.toLowerCase().replace(/\(.*?\)/g, "").trim();
  const picked = Object.values(picks).flatMap(asArr).some(p => p.toLowerCase().includes(w));
  const injected = Object.values(inj.bySlot).flat().some(o => o.name.toLowerCase().includes(w));
  const unplaced = inj.unplaced.some(u => u.toLowerCase().includes(w));
  return picked || injected || unplaced;
}
// Try a range of carried-in sets, including ones that collide on the same slot.
const sets = [
  ["Potato", "Carrot", "Shallot"],
  ["Carrot", "Shallot", "Garlic"],
  ["Chicken", "Pork", "Carrot"],
  ["Olive oil", "Carrot"],
  ["Saffron"],                         // truly homeless
  ["Carrot", "Carrot"],                // duplicate
  ["Garlic", "Shallot", "Carrot", "Cherry tomato"],
];
for (const set of sets) {
  const p = F.computeInitialPicks(confit, [], set);
  const j = F.computeInjections(confit, [], set);
  for (const ing of set)
    check(`[${set.join(",")}] "${ing}" accounted for`, accountedFor(ing, p, j));
}

// Single-ingredient sanity: each curated single maps to exactly its option.
check("Shallot alone → Shallots option",
  asArr(F.computeInitialPicks(confit, [], ["Shallot"]).ingredient).some(s => /shallots/i.test(s)));
check("Garlic alone → garlic option",
  asArr(F.computeInitialPicks(confit, [], ["Garlic"]).ingredient).some(s => /garlic/i.test(s)));
check("Apples alone → not auto-picked (only in combo)",
  asArr(F.computeInitialPicks(confit, [], ["Apples"]).ingredient).length === 0);

// ---- 8. Skip-option exclusivity -------------------------------------------------
// "Skip aromatics" must be mutually exclusive with real picks. We model the pure
// multi-select rule the component uses, and assert the invariant: after any pick,
// a Skip option never coexists with a real one.
check("isSkipOption: 'Skip aromatics'", F.isSkipOption("Skip aromatics") === true);
check("isSkipOption: 'Skip — keep it loose'", F.isSkipOption("Skip — keep it loose") === true);
check("isSkipOption: 'None'", F.isSkipOption("None") === true);
check("isSkipOption: 'No added salt'", F.isSkipOption("No added salt") === true);
check("isSkipOption: real option not skip", F.isSkipOption("Bay leaves + black peppercorns") === false);
check("isSkipOption: 'Neutral oil' not skip", F.isSkipOption("Neutral oil (canola, sunflower)") === false);

// Pure model of the multi-select pick rule (mirrors setPick's array branch).
function applyPick(arr, optionName) {
  if (arr.includes(optionName)) return arr.filter(x => x !== optionName); // toggle off
  if (F.isSkipOption(optionName)) return [optionName];                    // skip clears all
  return [...arr.filter(x => !F.isSkipOption(x)), optionName];            // real drops skip
}
const noSkipCoexist = (arr) => !(arr.some(F.isSkipOption) && arr.some(x => !F.isSkipOption(x)));

// Walk sequences of picks and assert the invariant holds after every step.
const seqs = [
  ["Black peppercorns", "Skip aromatics"],                 // your bug: real then skip
  ["Skip aromatics", "Black peppercorns"],                 // skip then real
  ["Bay leaves", "Black peppercorns", "Skip aromatics"],   // two reals then skip
  ["Skip aromatics", "Bay leaves", "Black peppercorns"],   // skip then two reals
  ["Skip aromatics", "Skip aromatics"],                    // skip toggles off
];
for (const seq of seqs) {
  let arr = [];
  seq.forEach((pick, i) => {
    arr = applyPick(arr, pick);
    check(`[${seq.join(" → ")}] step ${i + 1} no skip+real coexist`, noSkipCoexist(arr));
  });
}
// Specific outcomes
check("real then skip → only skip", JSON.stringify(applyPick(["Black peppercorns"], "Skip aromatics")) === JSON.stringify(["Skip aromatics"]));
check("skip then real → only real", JSON.stringify(applyPick(["Skip aromatics"], "Bay leaves")) === JSON.stringify(["Bay leaves"]));
check("skip toggled twice → empty", applyPick(["Skip aromatics"], "Skip aromatics").length === 0);

// ---- 9. Combo-state clear (prefix strip) ----------------------------------------
// Clearing a slot (or a Skip taking over) must wipe that slot's combo part-state so
// a reselected combo starts fresh. Mirror the prefix-strip used by clearComboStateForSlot.
function stripSlot(obj, slotId) {
  const prefix = `${slotId}::`;
  const next = {};
  for (const k of Object.keys(obj)) if (!k.startsWith(prefix)) next[k] = obj[k];
  return next;
}
const comboState = {
  "aromatic::Bay leaves + black peppercorns": ["Black peppercorns"],
  "aromatic::Sprigs of thyme + rosemary": ["Sprigs of thyme"],
  "ingredient::Apples + parsnips + carrots": ["Carrots"],
};
const cleared = stripSlot(comboState, "aromatic");
check("clear wipes aromatic combo state", Object.keys(cleared).every(k => !k.startsWith("aromatic::")));
check("clear leaves other slots intact", cleared["ingredient::Apples + parsnips + carrots"] !== undefined);
check("clear removes exactly the slot's keys", Object.keys(cleared).length === 1);

// ---- 10. Newsletter email validation -------------------------------------------
// Valid addresses accepted; junk the old weak regex (/\S+@\S+\.\S+/) let through
// must now be rejected.
const goodEmails = ["a@b.co", "mg.frank@example.com", "cook+news@sub.domain.org", "x@y.io"];
const badEmails = ["", "  ", "plainaddress", "no@tld", "two@@at.com", "space in@email.com",
  "trailing@dot.", "@nolocal.com", "spaces @x.com", "a@b", "a@b.c"];
goodEmails.forEach(e => check(`valid email accepted: ${e}`, F.isValidEmail(e) === true));
badEmails.forEach(e => check(`junk email rejected: "${e}"`, F.isValidEmail(e) === false));
check("isValidEmail handles non-string", F.isValidEmail(null) === false && F.isValidEmail(undefined) === false);
check("isValidEmail trims surrounding space", F.isValidEmail("  ok@fine.com  ") === true);

// ---- 11. Unique id generation ---------------------------------------------------
// makeId must not collide even when called many times in the same millisecond —
// the old Date.now().toString() did, so deleting one entry could delete another.
const ids = new Set();
let dupes = 0;
for (let i = 0; i < 5000; i++) { const id = F.makeId(); if (ids.has(id)) dupes++; ids.add(id); }
check("makeId: 5000 ids all unique (no same-ms collisions)", dupes === 0);
check("makeId: returns a non-empty string", typeof F.makeId() === "string" && F.makeId().length > 0);

// ---- 12. Shelf-life zones -------------------------------------------------------
// formatDaysLeft must classify every (short, outer) combo into exactly one coherent
// zone, with no gaps or contradictions at the boundaries.
check("daysBetween same day = 0", F.daysBetween("2026-06-01", "2026-06-01") === 0);
check("daysBetween forward = +5", F.daysBetween("2026-06-01", "2026-06-06") === 5);
check("daysBetween backward = -3", F.daysBetween("2026-06-01", "2026-05-29") === -3);

const zoneCases = [
  // [short, outer, expectedZone]
  [45, 60, "good"], [5, 10, "good"], [3, 8, "good"], [0, 5, "good"], [1, 6, "good"],
  [-2, 4, "usesoon"], [-1, 0, "usesoon"],
  [-5, -1, "past"], [-1, null, "past"],
  [10, null, "good"], [0, null, "good"],
  [3, 3, "good"], // collapsed window → single-point
];
for (const [s, o, zone] of zoneCases) {
  const r = F.formatDaysLeft(s, o);
  check(`shelf zone short=${s} outer=${o} → ${zone}`, r.zone === zone);
  check(`shelf zone short=${s} outer=${o} has text+tone`, !!r.text && !!r.tone);
}
// Invariant: zone is always one of the three known values, for a wide grid.
const validZones = new Set(["good", "usesoon", "past"]);
for (let s = -10; s <= 70; s += 1)
  for (const o of [null, s - 1, s, s + 2, s + 10, -1, 0]) {
    const r = F.formatDaysLeft(s, o);
    check(`shelf grid short=${s} outer=${o} valid zone`, validZones.has(r.zone));
  }
// "Past" only when the effective end is negative; "good" never shows for a negative short
// unless a window keeps it alive (usesoon).
check("negative short, no window → not good", F.formatDaysLeft(-1, null).zone !== "good");
check("0 days → Use today text", F.formatDaysLeft(0, null).text === "Use today");
check("1 day singular", F.formatDaysLeft(1, null).text === "1 day left");
check("weeks rounding for mid-range", /weeks left/.test(F.formatDaysLeft(45, 60).text));
check("months rounding for long-range", /months left/.test(F.formatDaysLeft(90, null).text));

// ---- 12b. Custom (unknown-type) pantry items ------------------------------------
// A custom item has no known shelf-life. It must NEVER be flagged past-prime, and it
// must show a neutral status rather than a false countdown. This mirrors the inline
// logic in the ScrapTracker enriched map.
function enrichItem(typeName, location, dateStored, knownTypes, today) {
  const typeMeta = knownTypes.find(t => t.name === typeName);
  const isCustom = !typeMeta;
  const shortDays = (typeMeta && typeMeta.locations[location]) || 0;
  const daysLeft = F.daysBetween(today, new Date(new Date(dateStored).getTime() + shortDays * 86400000));
  const sortKey = isCustom ? Infinity : daysLeft;
  return { isCustom, daysLeft, sortKey };
}
const KNOWN = [{ name: "Rendered Fat", locations: { fridge: 90 } }];
const today = "2026-06-01";
// Custom item stored today, last week, last year — never past-prime, always custom.
for (const date of ["2026-06-01", "2026-05-25", "2025-01-01"]) {
  const it = enrichItem("Bread", "fridge", date, KNOWN, today);
  check(`custom item (${date}) flagged custom`, it.isCustom === true);
  check(`custom item (${date}) not past-prime`, !(it.isCustom === false && it.sortKey < 0));
  check(`custom item (${date}) sorts last`, it.sortKey === Infinity);
}
// Known type still computes a real countdown and can go past-prime.
const known = enrichItem("Rendered Fat", "fridge", "2025-01-01", KNOWN, today);
check("known type is not custom", known.isCustom === false);
check("known type past its window → past-prime eligible", known.sortKey < 0);


// ---- 13. Engagement prompt timing ----------------------------------------------
// nextEarnedPrompt invariants: newsletter before review; review never before the
// newsletter is resolved; each prompt only when earned; nothing once both done.
const P = (e, d = 0) => F.nextEarnedPrompt(e, d);
// Fresh user, no activity → nothing.
check("fresh user → no prompt", P({}) === null);
// First scrapbook entry → newsletter.
check("1 scrapbook entry → newsletter", P({ scrapbookEntries: 1 }) === "newsletter");
check("2 recipes built → newsletter", P({ recipesBuilt: 2 }) === "newsletter");
check("1 recipe built → not yet", P({ recipesBuilt: 1 }) === null);
check("pantry add but <3 days → no newsletter", P({ pantryAdds: 1 }, 1) === null);
check("pantry add + 3 days → newsletter", P({ pantryAdds: 1 }, 3) === "newsletter");
// Review must NOT fire before newsletter resolved, even with heavy activity.
check("heavy activity but newsletter unresolved → newsletter (not review)",
  P({ scrapbookEntries: 5, recipesBuilt: 5 }) === "newsletter");
// After newsletter shown, review can fire when earned.
check("newsletter shown + 2 entries → review",
  P({ newsletterPromptShown: true, scrapbookEntries: 2 }) === "review");
check("newsletter signed up + 3 recipes → review",
  P({ newsletterSignedUp: true, recipesBuilt: 3 }) === "review");
check("newsletter shown but review not yet earned → null",
  P({ newsletterPromptShown: true, scrapbookEntries: 1 }) === null);
// Once review shown/dismissed, nothing more.
check("review already shown → null",
  P({ newsletterPromptShown: true, reviewPromptShown: true, scrapbookEntries: 9 }) === null);
check("review dismissed → null",
  P({ newsletterPromptShown: true, reviewPromptDismissed: true, recipesBuilt: 9 }) === null);
// Newsletter already signed up → never re-prompt newsletter.
check("newsletter signed up, low activity → null",
  P({ newsletterSignedUp: true, scrapbookEntries: 1 }) === null);
// INVARIANT sweep: review never returned while newsletter unresolved.
let reviewTooEarly = 0;
for (const sb of [0, 1, 2, 5]) for (const rb of [0, 2, 3, 5]) for (const pa of [0, 1, 3, 5]) for (const d of [0, 3, 7, 30]) {
  const r = P({ scrapbookEntries: sb, recipesBuilt: rb, pantryAdds: pa }, d); // newsletter unresolved
  if (r === "review") reviewTooEarly++;
}
check("review never fires before newsletter resolved (full sweep)", reviewTooEarly === 0);

// ---- 14. Deep-dive name matching (substring + exclusion + alias) ----------------
// Mirrors findDeepDive's rule so the matching discipline can't silently regress:
// substring match lights up descriptive phrases, an exclusion guard prevents false
// matches (almond "butter" is not dairy Butter), and aliases resolve alternate names.
(function () {
  const DIVES = {
    "Butter": { name: "Butter" },
    "Lime": { name: "Lime" },
    "Olive Oil": { name: "Olive Oil" },
    "Soy Sauce": { name: "Soy Sauce / Tamari" },
    "Parmesan": { name: "Parmesan & its Rinds" },
  };
  DIVES["Tamari"] = DIVES["Soy Sauce"];
  DIVES["Pecorino"] = DIVES["Parmesan"];
  const EXCL = { "Butter": [/almond butter/, /peanut butter/, /seed butter/], "Lime": [/\blimestone\b/] };
  const keys = Object.keys(DIVES);
  const find = (n) => {
    if (!n) return null;
    const l = n.toLowerCase();
    for (const k of keys) {
      if (l.includes(k.toLowerCase())) {
        const e = EXCL[k];
        if (e && e.some(re => re.test(l))) continue;
        return DIVES[k];
      }
    }
    return null;
  };
  check("dd: phrase 'light olive oil' → Olive Oil", find("light olive oil")?.name === "Olive Oil");
  check("dd: real Butter links", find("Butter")?.name === "Butter");
  check("dd: 'almond butter' does NOT link to Butter", find("Almond butter (sweeter)") === null);
  check("dd: 'sunflower seed butter' does NOT link to Butter", find("Sunflower seed butter") === null);
  check("dd: alias 'Tamari (gluten-free)' → Soy Sauce dive", find("Tamari (gluten-free)")?.name === "Soy Sauce / Tamari");
  check("dd: alias 'Pecorino Romano' → Parmesan dive", find("Pecorino Romano")?.name === "Parmesan & its Rinds");
  check("dd: unknown ingredient → null", find("dragonfruit") === null);
  // Ordering: "white wine vinegar" must resolve to Vinegar, NOT Wine — a real
  // collision once a generic "Wine" dive exists. Vinegar key must be checked first.
  (function () {
    const D = { "Vinegar": { name: "Vinegar" }, "Wine": { name: "Wine (for Cooking)" } };
    const ks = Object.keys(D);
    const f = (n) => { const l = n.toLowerCase(); for (const k of ks) if (l.includes(k.toLowerCase())) return D[k]; return null; };
    check("dd: 'white wine vinegar' → Vinegar (not Wine)", f("white wine vinegar").name === "Vinegar");
    check("dd: 'dry white wine' → Wine", f("dry white wine").name === "Wine (for Cooking)");
  })();
})();

// ---- 15. IngredientLink tokenizer -----------------------------------------------
// The inline ingredient linker must (a) link only the ingredient, not trailing
// parenthetical caveats, and (b) split multi-ingredient strings so each is linked
// independently with connectors left as plain text. This mirrors its split + match.
(function () {
  const DIVES = { "Greek Yogurt": 1, "Walnuts": 1, "Lemon": 1, "Lime": 1, "Soy Sauce": 1, "Vinegar": 1 };
  const keys = Object.keys(DIVES);
  const find = (t) => { const l = t.toLowerCase(); return keys.some(k => l.includes(k.toLowerCase())); };
  const tokenize = (name) => name.split(/(\s*[(),/+]\s*|\s+or\s+|\s+and\s+)/i).filter(p => p !== "" && p !== undefined);
  const isSep = (t) => /^(\s*[(),/+]\s*|\s+or\s+|\s+and\s+)$/i.test(t);
  // Returns the list of tokens that would become links.
  const linkedTokens = (name) => tokenize(name).filter(t => !isSep(t) && find(t));

  let r = linkedTokens("Greek yogurt (don't boil)");
  check("tok: parenthetical not linked", r.length === 1 && r[0] === "Greek yogurt");
  r = linkedTokens("Walnuts (more bitter)");
  check("tok: 'Walnuts (more bitter)' links only Walnuts", r.length === 1 && r[0] === "Walnuts");
  r = linkedTokens("Lemon or lime juice");
  check("tok: 'Lemon or lime juice' links both separately", r.length === 2 && r.includes("Lemon") && r.includes("lime juice"));
  r = linkedTokens("Soy sauce + a pinch of sugar");
  check("tok: connector text stays plain", r.length === 1 && r[0] === "Soy sauce");
  r = linkedTokens("white wine vinegar");
  check("tok: single multiword phrase stays one link", r.length === 1 && r[0] === "white wine vinegar");
  r = linkedTokens("Crushed crackers, chips, or pretzels");
  check("tok: nothing links when no token has a dive", r.length === 0);
})();

// ---- 16. Self-referential substitute filter --------------------------------------
// A deep-dive's "If you don't have it" list must not suggest the very ingredient
// being viewed (e.g. Wine listing "Dry white wine", or an alias like Parmesan
// listing "Pecorino"). The render drops any substitute whose findDeepDive resolves
// to the current dive's name.
(function () {
  const DIVES = {
    "Wine": { name: "Wine (for Cooking)" },
    "Vinegar": { name: "Vinegar" },
    "Parmesan": { name: "Parmesan & its Rinds" },
  };
  DIVES["Pecorino"] = DIVES["Parmesan"]; // alias
  const ks = Object.keys(DIVES);
  const find = (n) => { const l = n.toLowerCase(); for (const k of ks) if (l.includes(k.toLowerCase())) return DIVES[k]; return null; };
  const visible = (current, subs) => subs.filter(s => { const d = find(s); return !(d && d.name === current.name); });

  let v = visible(DIVES["Wine"], ["Dry white wine", "Vinegar", "Lemon"]);
  check("subfilter: Wine drops 'Dry white wine'", !v.includes("Dry white wine") && v.includes("Vinegar"));
  v = visible(DIVES["Parmesan"], ["Pecorino Romano", "Nutritional yeast (dairy-free)"]);
  check("subfilter: Parmesan drops its alias 'Pecorino Romano'", !v.some(s => /pecorino/i.test(s)) && v.length === 1);
  v = visible(DIVES["Vinegar"], ["Lemon or lime juice", "Pickle brine"]);
  check("subfilter: non-self substitutes are kept", v.length === 2);
})();

// ---- 17. LinkedProse prose linker ------------------------------------------------
// Auto-linking ingredient names inside sentences must: link the first occurrence of
// each ingredient, respect word boundaries, skip a short term that's part of a longer
// phrase belonging to another ingredient ("wine" in "wine vinegar"), and not link the
// same dive twice in one block.
(function () {
  const DIVES = {
    "Vinegar": { name: "Vinegar" }, "Wine": { name: "Wine (for Cooking)" },
    "Lemon": { name: "Lemon" }, "Pine Nuts": { name: "Pine Nuts" }, "Walnuts": { name: "Walnuts" },
  };
  const TERMS = Object.keys(DIVES).sort((a, b) => b.length - a.length);
  const EXCL = {};
  const find = (n) => { const l = n.toLowerCase(); for (const k of TERMS) if (l.includes(k.toLowerCase())) return DIVES[k]; return null; };
  const SKIP = { "wine": ["vinegar"] };
  const linkedNames = (text) => {
    const out = []; const seen = new Set(); let i = 0;
    while (i < text.length) {
      const atB = i === 0 || !/[A-Za-z]/.test(text[i - 1]); let m = null;
      if (atB) for (const term of TERMS) {
        const end = i + term.length;
        if (end > text.length) continue;
        if (text.slice(i, end).toLowerCase() !== term.toLowerCase()) continue;
        if (end < text.length && /[A-Za-z]/.test(text[end])) continue;
        const surf = text.slice(i, end);
        const sk = SKIP[surf.toLowerCase()];
        if (sk) { const rest = text.slice(end).replace(/^\s+/, "").toLowerCase(); if (sk.some(w => rest.startsWith(w))) continue; }
        const d = find(surf); if (!d || seen.has(d.name)) continue;
        m = { surf, d }; break;
      }
      if (m) { seen.add(m.d.name); out.push(m.surf); i += m.surf.length; } else i += 1;
    }
    return out;
  };
  check("prose: 'red wine vinegar' links vinegar not wine", JSON.stringify(linkedNames("red wine vinegar")) === JSON.stringify(["vinegar"]));
  check("prose: standalone 'wine' links", linkedNames("a splash of wine, then lemon").includes("wine"));
  check("prose: first occurrence of each, no dupes", JSON.stringify(linkedNames("Pine nuts, then more pine nuts")) === JSON.stringify(["Pine nuts"]));
  check("prose: word boundary — 'wineglass' not linked", linkedNames("a wineglass on the table").length === 0);
  check("prose: multiple distinct ingredients all link", linkedNames("Walnuts and a squeeze of lemon").length === 2);
  // Template linking: full template names link to a template handler; informal
  // lowercase mentions ("confit") do not.
  (function () {
    const TERMS = [
      { term: "Confit Project", type: "template" },
      { term: "Vinegar", type: "dive" },
    ].sort((a, b) => b.term.length - a.term.length);
    const DV = { "Vinegar": { name: "Vinegar" } };
    const findD = (n) => { const l = n.toLowerCase(); for (const k of Object.keys(DV)) if (l.includes(k.toLowerCase())) return DV[k]; return null; };
    const linked = (text) => {
      const out = []; const seen = new Set(); let i = 0;
      while (i < text.length) {
        const atB = i === 0 || !/[A-Za-z]/.test(text[i - 1]); let m = null;
        if (atB) for (const e of TERMS) {
          const end = i + e.term.length;
          if (end > text.length) continue;
          if (text.slice(i, end).toLowerCase() !== e.term.toLowerCase()) continue;
          if (end < text.length && /[A-Za-z]/.test(text[end])) continue;
          const surf = text.slice(i, end);
          if (e.type === "template") { if (seen.has("t:" + e.term)) continue; m = { surf, type: "template", dd: "t:" + e.term }; break; }
          const d = findD(surf); if (!d || seen.has("d:" + d.name)) continue; m = { surf, type: "dive", dd: "d:" + d.name }; break;
        }
        if (m) { seen.add(m.dd); out.push({ surf: m.surf, type: m.type }); i += m.surf.length; } else i += 1;
      }
      return out;
    };
    let r = linked("pick one Confit Project this month");
    check("prose: full template name links as template", r.length === 1 && r[0].type === "template" && r[0].surf === "Confit Project");
    r = linked("a 'confit everything' phase with vinegar");
    check("prose: lowercase 'confit' alone does not link", !r.some(x => x.type === "template") && r.some(x => x.type === "dive"));
  })();
})();

// ---- 18. Storage card action resolution ------------------------------------------
// Every storage card should resolve to an action: a deep-dive (via explicit `dive`
// hint or name match) OR a template. This mirrors the StorageTimer card render rule.
(function () {
  const DIVES = { "Rendered Fat": 1, "Confit Oil": 1, "Vinegar": 1, "Pickle Brine": 1, "Lemon": 1, "Parmesan": 1, "Anchovy": 1, "Homemade Salts": 1 };
  const TEMPLATES = ["Confit Project", "Anytime Hash", "Pantry Pasta", "Alchemist's Soup", "The Alchemist's Meal", "Stock from Scraps"];
  const find = (n) => { if (!n) return null; const l = n.toLowerCase(); for (const k of Object.keys(DIVES)) if (l.includes(k.toLowerCase())) return k; return null; };
  const resolves = (card) => {
    const dive = card.dive ? find(card.dive) : find(card.name);
    const tpl = card.template && TEMPLATES.includes(card.template);
    return !!(dive || tpl);
  };
  check("storage: explicit dive hint resolves", resolves({ name: "Frozen Citrus (zest, juice, halves)", dive: "Lemon" }));
  check("storage: name-match resolves", resolves({ name: "Pickle Brine" }));
  check("storage: template hint resolves", resolves({ name: "Soups and Stews", template: "Alchemist's Soup" }));
  check("storage: anchovies plural via dive hint", resolves({ name: "Open Anchovies", dive: "Anchovy" }));
  check("storage: salts resolve to Homemade Salts dive", resolves({ name: "Dried-Ingredient Salts", dive: "Homemade Salts" }));
  check("storage: relishes resolve via the Meal template", resolves({ name: "Relishes & Sauces", template: "The Alchemist's Meal" }));
  check("storage: truly unmapped card does NOT falsely resolve", !resolves({ name: "Mystery Jar" }));
  // Real-data sweep: no storage card may ever be actionless. A failure here means
  // "give this card a `dive` or `template` field", not that this check is wrong.
  const realGuide = eval(extractConst("STORAGE_GUIDE").replace(/^const STORAGE_GUIDE\s*=\s*/, ""));
  for (const card of realGuide)
    check(`storage: "${card.name}" resolves to an action`, resolves(card));
})();

// ---- 19. Past-prime "use them up" template aggregation ---------------------------
// The pantry callout ranks templates by how many past-prime items each would serve,
// most-helpful first. Mirrors templatesForScrapType / templatesForScraps.
(function () {
  const forType = (type) => {
    const t = type || "";
    if (t.includes("Oil") || t.includes("Confit")) return ["Pantry Pasta", "Pantry Popcorn", "Waste-Not Vinaigrette"];
    if (t.includes("Brine") || t.includes("Vinegar")) return ["Waste-Not Vinaigrette", "Anytime Hash"];
    if (t.includes("Rendered Fat")) return ["Anytime Hash", "Pantry Pasta", "Alchemist's Soup"];
    if (t.includes("Parmesan")) return ["Pantry Pasta", "Alchemist's Soup", "Improvised Pesto"];
    if (t.includes("Citrus")) return ["Alchemist's Soup", "Waste-Not Vinaigrette"];
    if (t.includes("Stock") || t.includes("Broth")) return ["Alchemist's Soup", "Pantry Pasta", "Anytime Hash"];
    if (t.includes("Soup") || t.includes("Stew")) return ["Alchemist's Soup"];
    if (t.includes("Pasta") || t.includes("Grain")) return ["Anytime Hash", "Alchemist's Soup"];
    if (t.includes("Meat") || t.includes("Fish")) return ["Anytime Hash", "Alchemist's Soup"];
    if (t.includes("Vegetable Scrap")) return ["Stock from Scraps", "Alchemist's Soup"];
    if (t.includes("Fried Shallot")) return ["Improvised Pesto", "Anytime Hash", "Pantry Pasta"];
    return ["Alchemist's Soup", "Anytime Hash"];
  };
  const forScraps = (scraps) => {
    const tally = new Map();
    for (const s of scraps) for (const n of forType(s.type)) tally.set(n, (tally.get(n) || 0) + 1);
    return [...tally.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
  };
  let r = forScraps([{ type: "Rendered Fat" }, { type: "Parmesan Rind" }, { type: "Frozen Citrus" }]);
  check("useup: most-serving template ranks first", r[0] === "Alchemist's Soup");
  r = forScraps([{ type: "Confit Oil" }]);
  check("useup: single oil yields oil-friendly templates", r.includes("Pantry Pasta") && r.includes("Pantry Popcorn"));
  check("useup: empty set yields no templates", forScraps([]).length === 0);
  check("useup: stock/broth routes to soup first", forType("Stock or Broth")[0] === "Alchemist's Soup");
  check("useup: vegetable scrap bag routes to Stock from Scraps", forType("Vegetable Scrap Bag (for stock)")[0] === "Stock from Scraps");
})();

// ---- 21. Builder anchor logic for new templates ---------------------------------
// A framework template with no `needs` is always buildable; a vegetable_scraps anchor
// is met by saved scraps or stock aromatics.
(function () {
  const anchorMet = (needs, has) => {
    if (needs.length === 0) return true;
    if (needs.includes("vegetable_scraps") && (has("carrot") || has("onion") || has("celery") || has("garlic") || has("mushroom") || has("scrap"))) return true;
    if (needs.includes("pasta") && has("pasta")) return true;
    return false;
  };
  const hasNone = () => false;
  const hasSet = (set) => (k) => set.includes(k);
  check("anchor: empty needs is always buildable (Meal Template)", anchorMet([], hasNone) === true);
  check("anchor: vegetable_scraps met by aromatics", anchorMet(["vegetable_scraps"], hasSet(["onion"])) === true);
  check("anchor: vegetable_scraps unmet with nothing relevant", anchorMet(["vegetable_scraps"], hasSet(["lemon"])) === false);
  check("anchor: pasta still gated normally", anchorMet(["pasta"], hasNone) === false);
})();

// ---- 22. Undo / restore logic for destructive pantry actions --------------------
// removeScrap captures the item + its index and re-inserts at that position on undo.
(function () {
  // Remove + undo restores the item at its original index.
  const remove = (list, id) => {
    const removed = list.find(s => s.id === id);
    const idx = list.findIndex(s => s.id === id);
    const after = list.filter(s => s.id !== id);
    const undo = () => {
      const next = [...after];
      next.splice(Math.min(idx, next.length), 0, removed);
      return next;
    };
    return { after, undo };
  };
  const start = [{ id: "a" }, { id: "b" }, { id: "c" }];
  let { after, undo } = remove(start, "b");
  check("undo: remove drops the item", after.length === 2 && !after.find(s => s.id === "b"));
  check("undo: restore re-inserts at original index", JSON.stringify(undo().map(s => s.id)) === JSON.stringify(["a", "b", "c"]));
  // Removing the last item, then undo, still restores at the end.
  ({ after, undo } = remove(start, "c"));
  check("undo: restore last item lands at end", JSON.stringify(undo().map(s => s.id)) === JSON.stringify(["a", "b", "c"]));
})();

// ---- 20. Pantry filter + sort pipeline -------------------------------------------
// The pantry list applies filter → query → sort. Verify each control and that the
// default (soonest-to-expire) preserves urgency ordering, custom items sort last.
(function () {
  // needsSoon captures both the "usesoon" zone AND the amber "warn" tone (today / ≤3 days).
  const items = [
    { label: "Bacon fat", location: "fridge", dateStored: "2026-05-01", sortKey: 40, zone: "good", needsSoon: false, isCustom: false },
    { label: "Old pesto", location: "fridge", dateStored: "2026-04-10", sortKey: -3, zone: "past", needsSoon: false, isCustom: false },
    { label: "Confit oil", location: "pantry", dateStored: "2026-05-20", sortKey: -1, zone: "past", needsSoon: false, isCustom: false },
    { label: "Aging brine", location: "fridge", dateStored: "2026-05-10", sortKey: 5, zone: "usesoon", needsSoon: true, isCustom: false },
    { label: "Use-today milk", location: "fridge", dateStored: "2026-05-18", sortKey: 0, zone: "good", needsSoon: true, isCustom: false }, // warn tone
    { label: "Mystery jar", location: "pantry", dateStored: "2026-05-25", sortKey: Infinity, zone: "custom", needsSoon: false, isCustom: true },
  ];
  const run = (filterBy, query, sortBy) => {
    let list = items;
    if (filterBy === "past") list = list.filter(s => !s.isCustom && s.sortKey < 0);
    else if (filterBy === "usesoon") list = list.filter(s => s.needsSoon);
    else if (["fridge", "freezer", "pantry"].includes(filterBy)) list = list.filter(s => s.location === filterBy);
    const q = (query || "").trim().toLowerCase();
    if (q) list = list.filter(s => s.label.toLowerCase().includes(q));
    const sorted = [...list];
    if (sortBy === "expiry") sorted.sort((a, b) => a.sortKey - b.sortKey);
    else if (sortBy === "added") sorted.sort((a, b) => String(b.dateStored).localeCompare(String(a.dateStored)));
    else if (sortBy === "name") sorted.sort((a, b) => String(a.label).localeCompare(String(b.label)));
    else if (sortBy === "location") sorted.sort((a, b) => String(a.location).localeCompare(String(b.location)) || a.sortKey - b.sortKey);
    return sorted.map(s => s.label);
  };
  check("pantry: expiry sort puts past-prime first, custom last",
    JSON.stringify(run("all", "", "expiry")) === JSON.stringify(["Old pesto", "Confit oil", "Use-today milk", "Aging brine", "Bacon fat", "Mystery jar"]));
  check("pantry: filter past", JSON.stringify(run("past", "", "expiry")) === JSON.stringify(["Old pesto", "Confit oil"]));
  check("pantry: filter fridge", JSON.stringify(run("fridge", "", "expiry")) === JSON.stringify(["Old pesto", "Use-today milk", "Aging brine", "Bacon fat"]));
  check("pantry: filter usesoon catches both warn tone and usesoon zone",
    JSON.stringify(run("usesoon", "", "expiry")) === JSON.stringify(["Use-today milk", "Aging brine"]));
  check("pantry: sort name", run("all", "", "name")[0] === "Aging brine");
  check("pantry: sort added newest-first", run("all", "", "added")[0] === "Mystery jar");
  check("pantry: filter + query compose", JSON.stringify(run("fridge", "brine", "expiry")) === JSON.stringify(["Aging brine"]));
})();

// ---- tab order model ------------------------------------------------------------
(function () {
  const def = F.defaultTabOrder();
  // Structure
  check("taborder: default flattens Home first", F.flattenTabOrder(def)[0] === "home");
  check("taborder: default flattens Support last", F.flattenTabOrder(def).slice(-1)[0] === "support");
  check("taborder: default has 8 tabs", F.flattenTabOrder(def).length === 8);
  check("taborder: default is valid", F.isValidTabOrder(def) === true);
  check("taborder: default keeps Pantry right after Builder",
    (() => { const f = F.flattenTabOrder(def); return f[f.indexOf("builder") + 1] === "pantry"; })());

  // Purity — moves never mutate the input
  const snap = JSON.stringify(def);
  F.moveGroup(def, "core", 1);
  F.moveTabInGroup(def, "core", "builder", 1);
  check("taborder: moves don't mutate input", JSON.stringify(def) === snap);

  // Group moves
  const movedDown = F.moveGroup(def, "core", 1);
  check("taborder: moving core down puts yourstuff first among movable",
    movedDown.findIndex(g => g.id === "yourstuff") < movedDown.findIndex(g => g.id === "core"));
  check("taborder: group move result still valid", F.isValidTabOrder(movedDown) === true);
  check("taborder: group move keeps Home first", movedDown[0].id === "home");
  check("taborder: group move keeps Support last", movedDown[movedDown.length - 1].id === "meta");

  // Pinned groups can't move
  check("taborder: home group can't move down", JSON.stringify(F.moveGroup(def, "home", 1)) === JSON.stringify(def));
  check("taborder: meta group can't move up", JSON.stringify(F.moveGroup(def, "meta", -1)) === JSON.stringify(def));

  // Movable bounds — first movable can't go up past Home, last can't go down past Support
  check("taborder: first movable group can't cross Home",
    JSON.stringify(F.moveGroup(def, "core", -1)) === JSON.stringify(def));
  check("taborder: last movable group can't cross Support",
    JSON.stringify(F.moveGroup(def, "reference", 1)) === JSON.stringify(def));

  // Within-group tab moves
  const swapped = F.moveTabInGroup(def, "core", "builder", 1);
  check("taborder: within-group swap reorders tabs",
    JSON.stringify(swapped.find(g => g.id === "core").tabs) === JSON.stringify(["pantry", "builder"]));
  check("taborder: within-group swap stays valid", F.isValidTabOrder(swapped) === true);
  check("taborder: tab can't move up past group start",
    JSON.stringify(F.moveTabInGroup(def, "core", "builder", -1)) === JSON.stringify(def));
  check("taborder: tab can't move down past group end",
    JSON.stringify(F.moveTabInGroup(def, "core", "pantry", 1)) === JSON.stringify(def));

  // Validation rejects corruption
  check("taborder: rejects non-array", F.isValidTabOrder(null) === false);
  check("taborder: rejects wrong group count", F.isValidTabOrder(def.slice(1)) === false);
  check("taborder: rejects Home not first",
    F.isValidTabOrder([...def.slice(1), def[0]]) === false);
  const migrated = F.defaultTabOrder();
  migrated.find(g => g.id === "core").tabs = ["builder", "templates"]; // stole a tab
  check("taborder: rejects tab migrated between groups", F.isValidTabOrder(migrated) === false);
  const dup = F.defaultTabOrder();
  dup.find(g => g.id === "core").tabs = ["builder", "builder"];
  check("taborder: rejects duplicate within group", F.isValidTabOrder(dup) === false);
})();

// ---- scrap enrichment (dashboard + pantry shared logic) -------------------------
(function () {
  const today = "2026-06-07";
  const daysAgo = n => new Date(new Date(today).getTime() - n * 86400000).toISOString().slice(0, 10);
  // Pickle Brine: fridge short=60, outer=90.
  const fresh = F.enrichScrap({ id: "a", type: "Pickle Brine", location: "fridge", dateStored: daysAgo(10) }, today);
  check("enrich: fresh brine not past prime", fresh.sortKey >= 0);
  check("enrich: fresh brine not needsSoon", fresh.needsSoon === false);
  check("enrich: fresh brine not custom", fresh.isCustom === false);

  // 62 days old: past the short end (60) but inside outer (90) → use-soon window.
  const aging = F.enrichScrap({ id: "b", type: "Pickle Brine", location: "fridge", dateStored: daysAgo(62) }, today);
  check("enrich: aging brine flagged needsSoon", aging.needsSoon === true);
  check("enrich: aging brine not yet past prime", aging.sortKey >= 0);

  // 95 days old: past the outer end (90) → past prime.
  const old = F.enrichScrap({ id: "c", type: "Pickle Brine", location: "fridge", dateStored: daysAgo(95) }, today);
  check("enrich: old brine past prime (negative sortKey)", old.sortKey < 0);

  // Custom (unknown) type: never past prime, never needsSoon.
  const custom = F.enrichScrap({ id: "d", type: "Mystery Jar", location: "fridge", dateStored: daysAgo(400) }, today);
  check("enrich: custom is custom", custom.isCustom === true);
  check("enrich: custom never past prime", !(custom.sortKey < 0));
  check("enrich: custom never needsSoon", custom.needsSoon === false);
  check("enrich: custom sortKey is Infinity", custom.sortKey === Infinity);

  // enrichScraps maps the whole list.
  const list = F.enrichScraps([
    { id: "1", type: "Pickle Brine", location: "fridge", dateStored: daysAgo(95) },
    { id: "2", type: "Mystery Jar", location: "fridge", dateStored: daysAgo(1) },
  ], today);
  check("enrichScraps: returns same length", list.length === 2);
  check("enrichScraps: dashboard use-soon filter catches the old one",
    list.filter(s => s.needsSoon || (!s.isCustom && s.sortKey < 0)).length === 1);

  // statusText is the single source of truth for status wording across the Pantry,
  // Builder chips, and Home dashboard — it must exist and match the zone.
  check("enrich: statusText present on fresh item", typeof fresh.statusText === "string" && fresh.statusText.length > 0);
  check("enrich: past-prime statusText", old.statusText === "Past its prime");
  check("enrich: use-soon statusText matches zone", aging.zone !== "usesoon" || /^Use soon/.test(aging.statusText));
  check("enrich: custom statusText", custom.statusText === "No expiry tracked");
  // Dashboard trims advisory clauses at the em-dash — the trim of the use-soon text
  // must read "use soon" (a truncation of the one source, not a second derivation).
  check("enrich: dashboard trim of use-soon text",
    aging.zone !== "usesoon" || aging.statusText.split(" — ")[0].toLowerCase() === "use soon");

  // Builder usable-scraps filter: custom items must remain selectable indefinitely
  // (sortKey Infinity passes >= 0). A prior inline duplicate treated customs as
  // 0-day items and silently dropped them from the Builder after day one.
  const builderUsable = list.filter(s => s.sortKey >= 0);
  check("builder-usable: old custom item stays selectable",
    builderUsable.some(s => s.id === "2"));
  check("builder-usable: past-prime known item is excluded",
    !builderUsable.some(s => s.id === "1"));
  check("builder-usable: customs sort last",
    builderUsable.length === 0 || builderUsable[builderUsable.length - 1].sortKey === Infinity || builderUsable.every(s => s.sortKey !== Infinity));
})();

// ---- 23. External-link configuration guard ----------------------------------------
// Support actions and the review prompt render only for real, filled-in links.
// null/placeholder values must read as "not configured" so no dead button ships.
(function () {
  check("links: null not configured", F.isConfiguredLink(null) === false);
  check("links: undefined not configured", F.isConfiguredLink(undefined) === false);
  check("links: empty/whitespace not configured", F.isConfiguredLink("  ") === false);
  check("links: old tip stub rejected", F.isConfiguredLink("https://example.com/tip?amount=5") === false);
  check("links: placeholder ASIN rejected", F.isConfiguredLink("https://www.amazon.com/dp/your-asin") === false);
  check("links: http (non-https) rejected", F.isConfiguredLink("http://foo.com") === false);
  check("links: non-string rejected", F.isConfiguredLink(42) === false);
  check("links: real stripe link accepted", F.isConfiguredLink("https://buy.stripe.com/abc123") === true);
  check("links: real amazon review link accepted", F.isConfiguredLink("https://www.amazon.com/review/create-review?asin=B0ABCDEF12") === true);
  check("tips: null → no amounts", F.tipAmounts(null).length === 0);
  check("tips: empty object → no amounts", F.tipAmounts({}).length === 0);
  check("tips: sorted numerically", JSON.stringify(F.tipAmounts({ 10: "https://x.co/a", 3: "https://x.co/b", 5: "https://x.co/c" })) === "[3,5,10]");
  check("tips: unconfigured amount dropped", JSON.stringify(F.tipAmounts({ 3: "https://x.co/a", 5: null })) === "[3]");
  check("tips: non-positive amount dropped", F.tipAmounts({ "-3": "https://x.co/a", 0: "https://x.co/b" }).length === 0);
  // Source-level regression guard: the placeholder URLs must never reappear as
  // live values in the jsx (the config comments spell the patterns differently).
  check("links: no example.com tip stub in source", !src.includes("example.com/tip"));
  check("links: no placeholder-ASIN url in source", !src.includes("amazon.com/dp/your-asin"));
})();

// ---- 24. Zero-result nearest-match suggestions -------------------------------------
// closestMatches powers "did you mean" in zero-result empty states. It must catch
// typos and plural drift while staying silent on gibberish and very short queries —
// a wrong suggestion is worse than none.
(function () {
  check("edit: identity is 0", F.editDistance("brine", "brine") === 0);
  check("edit: one substitution", F.editDistance("brine", "bryne") === 1);
  check("edit: one insertion", F.editDistance("brine", "brines") === 1);
  check("edit: empty vs word", F.editDistance("", "abc") === 3);

  check("near: typo finds parmesan", F.closestMatches("parmesean", ["Parmesan Rinds", "Pickle Brine", "Open Anchovies"])[0] === "Parmesan Rinds");
  check("near: plural finds brine", F.closestMatches("brines", ["Pickle Brine", "Parmesan Rinds"])[0] === "Pickle Brine");
  check("near: prefix finds anchovies", F.closestMatches("anch", ["Open Anchovies", "Confit Garlic"])[0] === "Open Anchovies");
  check("near: gibberish → nothing", F.closestMatches("zzzqx", ["Pickle Brine", "Parmesan Rinds"]).length === 0);
  check("near: under 3 chars → nothing", F.closestMatches("pa", ["Pasta", "Parmesan Rinds"]).length === 0);
  check("near: case-insensitive", F.closestMatches("LEMON", ["Frozen Citrus (zest, juice, halves)", "Lemon"]).includes("Lemon"));
  check("near: respects max", F.closestMatches("confi", ["Confit Garlic", "Meat Confit", "Vegetable/Fruit Confit"], 2).length === 2);
  check("near: default max is 2", F.closestMatches("confi", ["Confit Garlic", "Meat Confit", "Vegetable/Fruit Confit"]).length === 2);
  check("near: empty query safe", F.closestMatches("", ["a"]).length === 0);
  check("near: null query safe", F.closestMatches(null, ["a"]).length === 0);
  check("near: empty candidates safe", F.closestMatches("brine", []).length === 0);
  check("near: prefix outranks typo", F.closestMatches("parm", ["Warm Rolls", "Parmesan Rinds"])[0] === "Parmesan Rinds");
  check("near: exact word match wins", F.closestMatches("lemon", ["Lemon", "Melon"])[0] === "Lemon");
})();

// ---- 25. Template-name referential integrity --------------------------------------
// Every name that can reach TemplateModal must resolve to real content, so the
// framework fallback ("walkthrough isn't in the app yet") stays unreachable. When a
// check here fails, it names exactly the walkthrough the author needs to write (or
// the reference to fix) — it is not a harness bug.
(function () {
  const evalConst = (name) =>
    eval(extractConst(name).replace(new RegExp(`^const ${name}\\s*=\\s*`), ""));
  const templates = evalConst("TEMPLATES");
  const names = new Set(templates.map(t => t.name));
  check("tplint: TEMPLATES is non-empty", templates.length > 0);

  // Object-literal keys (TEMPLATE_DETAILS etc.) sit two-space indented and
  // double-quoted between their const and the next one.
  const keysOf = (constName, nextConst) => {
    const start = src.indexOf(`const ${constName}`);
    const end = src.indexOf(`const ${nextConst}`);
    return [...src.slice(start, end).matchAll(/^  "([^"]+)": \{/gm)].map(m => m[1]);
  };
  const detailKeys = keysOf("TEMPLATE_DETAILS", "BUILDER_RECIPES");
  check("tplint: TEMPLATE_DETAILS keys extracted", detailKeys.length > 0);
  for (const t of templates)
    check(`tplint: "${t.name}" has a TEMPLATE_DETAILS walkthrough`, detailKeys.includes(t.name));
  for (const k of detailKeys)
    check(`tplint: details key "${k}" is a known template`, names.has(k));

  // Storage cards' template actions must open a real template.
  for (const card of evalConst("STORAGE_GUIDE"))
    if (card.template) check(`tplint: storage "${card.name}" → known template`, names.has(card.template));

  // Past-prime "use them up" suggestions only ever emit known template names.
  for (const st of evalConst("SCRAP_TYPES"))
    for (const n of F.templatesForScrapType(st.name))
      check(`tplint: use-up suggestion "${n}" (for ${st.name}) is a known template`, names.has(n));
  for (const n of F.templatesForScrapType("Something Unrecognized"))
    check(`tplint: use-up fallback "${n}" is a known template`, names.has(n));

  // Deep-dive usedIn references (double-quoted in source, so JSON.parse is safe).
  for (const m of src.matchAll(/usedIn:\s*\[([^\]]*)\]/g))
    for (const n of JSON.parse("[" + m[1] + "]"))
      check(`tplint: usedIn "${n}" is a known template`, names.has(n));
})();

// ---- 26. Real BUILDER_RECIPES data sweep -------------------------------------------
// The harness previously only exercised builder logic on hand-built mini-models;
// this sweeps the real data so a malformed or misnamed entry fails by name.
(function () {
  const evalConst = (name) =>
    eval(extractConst(name).replace(new RegExp(`^const ${name}\\s*=\\s*`), ""));
  const recipes = eval("(" + extractObjConst("BUILDER_RECIPES") + ")");
  const names = new Set(evalConst("TEMPLATES").map(t => t.name));

  // Schema: every entry is a complete, well-formed builder.
  for (const [key, r] of Object.entries(recipes)) {
    check(`bldr: "${key}" is a known template`, names.has(key));
    check(`bldr: "${key}" yield label`, typeof r.yield?.label === "string" && r.yield.label.length > 0);
    check(`bldr: "${key}" has slots`, Array.isArray(r.slots) && r.slots.length > 0);
    check(`bldr: "${key}" has method`, Array.isArray(r.method) && r.method.length > 0 && r.method.every(m => typeof m === "string" && m));
    check(`bldr: "${key}" has storage`, typeof r.storage === "string" && r.storage.length > 0);
    for (const s of r.slots) {
      check(`bldr: "${key}"/"${s.id}" slot fields`,
        typeof s.id === "string" && typeof s.label === "string" && typeof s.unit === "string" &&
        typeof s.ratio === "number" && typeof s.helpText === "string");
      check(`bldr: "${key}"/"${s.id}" has 2+ options`, Array.isArray(s.options) && s.options.length >= 2);
      for (const o of s.options)
        check(`bldr: "${key}"/"${s.id}"/"${o.name}" option fields`,
          typeof o.name === "string" && o.name.length > 0 && typeof o.note === "string" && o.note.length > 0);
    }
  }

  // The audit's content gap is closed: both formerly builder-less templates build.
  check("bldr: The Alchemist's Meal has a builder", !!recipes["The Alchemist's Meal"]);
  check("bldr: Stock from Scraps has a builder", !!recipes["Stock from Scraps"]);

  const stock = recipes["Stock from Scraps"];
  const meal = recipes["The Alchemist's Meal"];

  // Trap guard: the SCRAP_KEYWORDS "stock" rule matches the vegetable-scrap-bag type,
  // so a non-skip option named "...stock..." would be spuriously auto-picked by the
  // very scrap this template exists to use. Keep "stock" out of option names.
  for (const s of stock.slots)
    for (const o of s.options)
      if (!F.isSkipOption(o.name))
        check(`bldr: stock option "${o.name}" avoids the word "stock"`, !/stock/i.test(o.name));

  // Every skip-styled option in the new builders is recognized by the shared
  // detector (data-driven, so renames can't silently break skip exclusivity).
  check("bldr: 'Skip aromatics' is a skip", F.isSkipOption("Skip aromatics"));
  check("bldr: bare 'Skip' is a skip", F.isSkipOption("Skip"));
  for (const r of [stock, meal])
    for (const s of r.slots)
      for (const o of s.options)
        if (/^skip/i.test(o.name))
          check(`bldr: skip option "${o.name}" detected`, F.isSkipOption(o.name));
  check("bldr: aromatics combo detected", F.isComboName("Bay leaves + black peppercorns"));

  // Carried-in routing against the real slots.
  const bag = F.computeInitialPicksFromScraps(stock, [{ type: "Vegetable Scrap Bag (for stock)" }]);
  check("bldr: scrap bag auto-picks the freezer-bag option",
    bag.scraps === "Frozen vegetable scrap bag from your pantry");
  const rind = F.computeInitialPicksFromScraps(stock, [{ type: "Parmesan Rinds" }]);
  check("bldr: parmesan rinds route to The Depth", /parmesan rind/i.test(rind.depth || ""));
  const chick = F.computeInitialPicks(stock, [], ["Chicken"]);
  check("bldr: carried chicken picks the carcass", asArr(chick.depth).some(p => /carcass/i.test(p)));
  const conf = F.computeInitialPicksFromScraps(meal, [{ type: "Meat Confit" }]);
  check("bldr: confit scrap routes to The Base", conf.base === "Confit from your pantry");
  const shal = F.computeInitialPicksFromScraps(meal, [{ type: "Fried Shallots" }]);
  check("bldr: fried shallots route to The Crunch", /fried shallots/i.test(shal.crunch || ""));
  const vin = F.computeInitialPicksFromScraps(meal, [{ type: "Infused Vinegar" }]);
  check("bldr: infused vinegar routes to The Flavor", /vinegar/i.test(vin.finish || ""));

  // No carried-in ingredient vanishes (same invariant as test 7, real builders).
  for (const [builder, set] of [
    [stock, ["Onion", "Carrot", "Mushroom"]],
    [stock, ["Chicken"]],
    [meal, ["Chicken", "Rice"]],
    [meal, ["Lemon"]],
  ]) {
    const p = F.computeInitialPicks(builder, [], set);
    const j = F.computeInjections(builder, [], set);
    for (const ing of set)
      check(`bldr: [${set.join(",")}] "${ing}" accounted for`, accountedFor(ing, p, j));
  }
})();

// ---- report ---------------------------------------------------------------------
console.log(`\n${pass} passed, ${fail} failed  (${pass + fail} assertions)`);
if (fail) { console.log("\nFAILURES:"); fails.forEach(f => console.log("  ✗ " + f)); process.exit(1); }
else console.log("All builder logic invariants hold. ✓");
