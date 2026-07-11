import { useState, useMemo, useEffect, useRef, Fragment } from "react";
import { BookOpen, Clock, Sparkles, ChefHat, ArrowRight, X, Check, Flame, Snowflake, AlertTriangle, Archive, Plus, Trash2, Wand2, FileText, Quote, Plus as PlusIcon, Minus, BookMarked, Share2, Download, Copy, Heart, Moon, Sun, Monitor, Type, Settings, SlidersHorizontal, ChevronDown, ChevronLeft, ArrowUpDown, ListFilter, Refrigerator, Home as HomeIcon } from "lucide-react";


// ============ EXTERNAL LINKS (author: fill these in before launch) ============
// null = not configured yet. Anything left null stays HIDDEN: the Support tab only
// renders actions whose links exist, and the review prompt never fires without a
// real review link. Fill a value in and the action appears — no other code changes.
const EXTERNAL_LINKS = {
  // Amazon "write a review" page for the book, with the real ASIN, e.g.
  // "https://www.amazon.com/review/create-review?asin=XXXXXXXXXX"
  amazonReview: null,
  // Amazon product page for gifting, e.g. "https://www.amazon.com/dp/XXXXXXXXXX"
  amazonBook: null,
  // Tip links (Stripe payment links / Ko-fi / Buy Me a Coffee), one per amount, e.g.
  // { 3: "https://buy.stripe.com/aaa", 5: "https://buy.stripe.com/bbb", 10: "..." }
  tips: null,
  // Where the app lives (used in the share message).
  appUrl: "https://www.mgfrankbooks.com",
};

// True only for a real, filled-in link — not null/empty, not one of the placeholder
// patterns that used to ship ("example.com", "your-asin"), and https only.
function isConfiguredLink(url) {
  if (typeof url !== "string") return false;
  const u = url.trim();
  if (!u) return false;
  if (/example\.com|your-asin/i.test(u)) return false;
  return /^https:\/\//.test(u);
}

// Sorted numeric tip amounts whose links are actually configured.
function tipAmounts(tips) {
  if (!tips) return [];
  return Object.keys(tips)
    .filter(k => isConfiguredLink(tips[k]))
    .map(Number)
    .filter(n => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
}

// ============ DATA (drawn from the book) ============

const SUBSTITUTIONS = {
  "Lemon Juice": {
    role: "Acid & Brightness",
    swaps: ["Lime juice", "White wine vinegar", "Apple cider vinegar", "Pickle brine", "Dry white wine"],
    note: "Vinegars are more assertive than citrus — start small and adjust to taste.",
  },
  "Vinegar": {
    role: "Acid & Brightness",
    swaps: ["Lemon or lime juice", "Pickle brine", "Olive brine", "Wine"],
    note: "Different vinegars carry different sweetness — balsamic is sweeter than cider.",
  },
  "Butter": {
    role: "Fat & Richness",
    swaps: ["Rendered bacon or chicken fat", "Olive oil", "Coconut oil", "Ghee", "Greek yogurt (in baking)"],
    note: "Rendered fats add savory notes; yogurt adds tang.",
  },
  "Neutral Oil": {
    role: "Fat & Cooking Medium",
    swaps: ["Avocado oil", "Peanut oil", "Grapeseed oil", "Light olive oil (low heat)", "Ghee"],
    note: "Mind the smoke point — extra virgin olive oil burns at high heat.",
  },
  "Parmesan Cheese": {
    role: "Umami & Salt",
    swaps: ["Minced anchovy", "Tomato paste", "Soy sauce", "Worcestershire", "Nutritional yeast"],
    note: "These are potent. Start with a small amount and taste as you go.",
  },
  "Soy Sauce": {
    role: "Umami & Salt",
    swaps: ["Worcestershire sauce", "Miso paste thinned with water", "Minced anchovy + pinch of salt"],
    note: "Miso is earthy; Worcestershire is tangy.",
  },
  "Fresh Herbs": {
    role: "Aromatic Brightness",
    swaps: ["Dried herbs (use 1/3 the amount)", "Cilantro ↔ parsley", "Marjoram ↔ oregano", "Tarragon ↔ fennel"],
    note: "Add dried herbs during cooking; add fresh herbs near the end.",
  },
  "Heavy Cream": {
    role: "Body & Creaminess",
    swaps: ["Full-fat coconut milk", "Puréed potato or white beans", "Greek yogurt (don't boil)", "Sour cream (don't boil)"],
    note: "Yogurt and sour cream curdle at high heat — fold in off the heat.",
  },
  "Breadcrumbs": {
    role: "Binder & Crunch",
    swaps: ["Crushed crackers, chips, or pretzels", "Rolled oats", "Cooked, mashed grains (quinoa, rice)"],
    note: "Crushed snacks add salt and flavor; oats and grains bind softly.",
  },
  "Spices": {
    role: "Warm & Aromatic Notes",
    swaps: ["Nutmeg ↔ mace", "Cumin ↔ coriander", "Allspice ↔ cloves", "Black pepper for Sichuan pepper"],
    note: "Aim for the same warm/earthy/pungent tone. Learn your blends so you can rebuild them: Chili powder = paprika + cumin + cayenne + oregano. Curry powder = turmeric + cumin + coriander. Five-spice = cinnamon + cloves + fennel seed + star anise + Sichuan pepper.",
  },
};

const STORAGE_GUIDE = [
  { name: "Rendered Fat (bacon, chicken)", category: "Fats", fridge: "3–6 months", freezer: "1+ year", note: "Strain solids before storing.", dive: "Rendered Fat" },
  { name: "Cooked Infused Oil (confit oil)", category: "Fats", fridge: "Several weeks", freezer: "—", note: "More stable than raw infusions thanks to the cook.", dive: "Confit Oil" },
  { name: "Raw Infused Oil (garlic, fresh herbs)", category: "Fats", fridge: "1–2 weeks max", freezer: "Do not freeze", note: "⚠️ Botulism risk with raw garlic in oil — refrigerate, use quickly.", dive: "Confit Oil" },
  { name: "Infused Vinegar (fruit scraps)", category: "Acids", fridge: "—", freezer: "—", pantry: "6–12 months", note: "Strain ingredients out before long-term storage.", dive: "Vinegar" },
  { name: "Pickle Brine", category: "Acids", fridge: "2–3 months", freezer: "—", note: "Keep utensils clean to avoid contamination.", dive: "Pickle Brine" },
  { name: "Frozen Citrus (zest, juice, halves)", category: "Acids", fridge: "—", freezer: "6–12 months", note: "Great for stocks, steaming fish, drinks.", dive: "Lemon" },
  { name: "Parmesan Rinds", category: "Umami", fridge: "—", freezer: "1+ year", note: "Wrap tightly to prevent drying out.", dive: "Parmesan" },
  { name: "Open Anchovies", category: "Umami", fridge: "Up to 2 months", freezer: "—", note: "Keep submerged in oil.", dive: "Anchovy" },
  { name: "Confit Garlic", category: "Umami", fridge: "Several weeks", freezer: "—", note: "Must remain submerged in fat.", template: "Confit Project" },
  { name: "Dried-Ingredient Salts", category: "Salts", fridge: "—", freezer: "—", pantry: "1+ year", note: "Clumping is humidity, not spoilage.", dive: "Homemade Salts" },
  { name: "Fresh-Ingredient Salts", category: "Salts", fridge: "1–2 weeks", freezer: "—", note: "Moisture risks mold — keep cold.", dive: "Homemade Salts" },
  { name: "Meat Confit", category: "Compound", fridge: "Up to 1 month", freezer: "—", note: "Keep fully submerged in fat.", template: "Confit Project" },
  { name: "Vegetable/Fruit Confit", category: "Compound", fridge: "Several weeks", freezer: "—", note: "Keep fully submerged in fat.", template: "Confit Project" },
  { name: "Relishes & Sauces", category: "Compound", fridge: "4–7 days", freezer: "—", note: "Reheat to 165°F (74°C).", template: "The Alchemist's Meal" },
  { name: "Cooked Meat or Poultry", category: "Leftovers", fridge: "3–4 days", freezer: "2–6 months", template: "Anytime Hash" },
  { name: "Cooked Fish", category: "Leftovers", fridge: "3–4 days", freezer: "4–6 months", template: "Anytime Hash" },
  { name: "Cooked Pasta or Grains", category: "Leftovers", fridge: "3–5 days", freezer: "1–2 months", template: "Pantry Pasta" },
  { name: "Soups and Stews", category: "Leftovers", fridge: "3–4 days", freezer: "2–3 months", template: "Alchemist's Soup" },
  { name: "Stock or Broth", category: "Leftovers", fridge: "3–4 days", freezer: "2–6 months", note: "Cool quickly in shallow containers; reheat to a rolling boil.", template: "Stock from Scraps" },
];

const TEMP_GUIDE = [
  { food: "Leftovers, Casseroles", temp: "165°F / 74°C", rest: "None" },
  { food: "Poultry (whole or ground)", temp: "165°F / 74°C", rest: "None" },
  { food: "Ground Beef, Pork, Lamb", temp: "160°F / 71°C", rest: "None" },
  { food: "Steaks, Roasts, Chops", temp: "145°F / 63°C", rest: "3 minutes" },
  { food: "Fish & Shellfish", temp: "145°F / 63°C", rest: "None" },
];

// Shelf life data for the scraps tracker. Days are drawn from Appendix II.
// Where the book gives a range, the tracker uses the CONSERVATIVE (short) end for
// fridge — so it warns sooner, which is the safe default for perishables — and the
// higher end for freezer, since freezer times are quality-based, not safety-critical.
// The Storage & Safety tab shows the book's full ranges for reference.
const SCRAP_TYPES = [
  { name: "Rendered Fat (bacon, chicken)", category: "Fats", locations: { fridge: 90, freezer: 365 }, outer: { fridge: 180 }, default: "fridge" },
  { name: "Cooked Infused Oil (confit oil)", category: "Fats", locations: { fridge: 21 }, default: "fridge", warning: "Keep ingredients submerged." },
  { name: "Raw Infused Oil (garlic, fresh herbs)", category: "Fats", locations: { fridge: 7 }, outer: { fridge: 14 }, default: "fridge", warning: "⚠️ Botulism risk — refrigerate, use within 1–2 weeks max." },
  { name: "Infused Vinegar", category: "Acids", locations: { pantry: 180 }, outer: { pantry: 365 }, default: "pantry", warning: "Strain ingredients out before long-term storage." },
  { name: "Pickle Brine", category: "Acids", locations: { fridge: 60 }, outer: { fridge: 90 }, default: "fridge" },
  { name: "Frozen Citrus (zest, juice, halves)", category: "Acids", locations: { freezer: 180 }, outer: { freezer: 365 }, default: "freezer" },
  { name: "Parmesan Rinds", category: "Umami", locations: { freezer: 365 }, default: "freezer", warning: "Wrap tightly to prevent drying out." },
  { name: "Open Anchovies", category: "Umami", locations: { fridge: 60 }, default: "fridge", warning: "Keep submerged in oil." },
  { name: "Confit Garlic", category: "Umami", locations: { fridge: 21 }, default: "fridge", warning: "Must remain submerged in fat." },
  { name: "Dried-Ingredient Salt", category: "Salts", locations: { pantry: 365 }, default: "pantry" },
  { name: "Fresh-Ingredient Salt", category: "Salts", locations: { fridge: 7 }, outer: { fridge: 14 }, default: "fridge", warning: "Refrigerate to prevent mold." },
  { name: "Meat Confit", category: "Compound", locations: { fridge: 30 }, default: "fridge", warning: "Keep fully submerged in fat." },
  { name: "Vegetable/Fruit Confit", category: "Compound", locations: { fridge: 21 }, default: "fridge", warning: "Keep fully submerged in fat." },
  { name: "Relishes & Sauces", category: "Compound", locations: { fridge: 4 }, outer: { fridge: 7 }, default: "fridge", warning: "Reheat to 165°F (74°C)." },
  { name: "Cooked Meat or Poultry", category: "Leftovers", locations: { fridge: 3, freezer: 60 }, outer: { fridge: 4, freezer: 180 }, default: "fridge" },
  { name: "Cooked Fish", category: "Leftovers", locations: { fridge: 3, freezer: 120 }, outer: { fridge: 4, freezer: 180 }, default: "fridge" },
  { name: "Cooked Pasta or Grains", category: "Leftovers", locations: { fridge: 3, freezer: 30 }, outer: { fridge: 5, freezer: 60 }, default: "fridge" },
  { name: "Soup or Stew", category: "Leftovers", locations: { fridge: 3, freezer: 60 }, outer: { fridge: 4, freezer: 90 }, default: "fridge" },
  { name: "Vegetable Scrap Bag (for stock)", category: "Leftovers", locations: { freezer: 180 }, default: "freezer" },
  { name: "Stock or Broth", category: "Leftovers", locations: { fridge: 3, freezer: 90 }, outer: { fridge: 4, freezer: 180 }, default: "fridge", warning: "Cool quickly in shallow containers. Reheat to a rolling boil before use." },
  { name: "Fried Shallots", category: "Compound", locations: { pantry: 7, freezer: 180 }, default: "pantry" },
];

// Pantry items the meal builder recognizes
const PANTRY = {
  proteins: ["Chicken", "Beef/Steak", "Pork", "Ground meat", "Salmon/Fish", "Shrimp", "Eggs", "Sausage", "Bacon"],
  starches: ["Pasta", "Rice", "Potatoes", "Sweet potato", "Bread", "Tortillas", "Quinoa", "Oats", "Beans"],
  vegetables: ["Onion", "Garlic", "Shallot", "Carrot", "Kale/Spinach", "Tomato", "Pepper", "Mushroom", "Broccoli", "Lemon"],
  pantry: ["Olive oil", "Butter", "Vinegar", "Soy sauce", "Parmesan", "Anchovy", "Mustard", "Capers", "Pickle brine", "Cream/Yogurt"],
  herbs: ["Basil", "Parsley", "Cilantro", "Thyme", "Rosemary", "Dill", "Old Bay"],
};

// Recipe templates with tag-based matching
const TEMPLATES = [
  {
    name: "Pantry Pasta",
    tagline: "Layered, elegant, made from staples",
    needs: ["pasta"],
    boosts: ["garlic", "anchovy", "parmesan", "olive oil", "lemon", "tomato", "capers", "butter", "pepper", "parsley", "basil"],
    blurb: "Build flavor in stages: heat fat, bloom aromatics, add a body (tomato or cream), simmer in umami, toss with al dente pasta and a splash of starchy water, finish with crunch and freshness.",
    color: "amber",
  },
  {
    name: "Anytime Hash",
    tagline: "A canvas for leftovers",
    needs: ["potato"],
    boosts: ["onion", "shallot", "garlic", "chicken", "sausage", "bacon", "steak", "egg", "kale", "spinach", "broccoli", "pepper", "butter"],
    blurb: "Sauté aromatics in fat, add starches and let them crisp, fold in protein, wilt in greens, crack eggs into wells. Finish with vinegar or lemon and herbs.",
    color: "rust",
  },
  {
    name: "Improvised Pesto",
    tagline: "Sauce as method, not recipe",
    needs: ["herb_or_green"],
    boosts: ["basil", "parsley", "cilantro", "kale", "spinach", "garlic", "shallot", "parmesan", "anchovy", "olive oil", "lemon"],
    blurb: "2 parts greens, 1 part nuts, 1 part umami, 1–2 parts oil. Pulse, then stream in oil. Taste before salting — your umami is already salty.",
    color: "moss",
  },
  {
    name: "Confit Project",
    tagline: "Slow-cook in fat, keep the gold",
    needs: ["sturdy_ingredient"],
    boosts: ["garlic", "carrot", "shallot", "onion", "potato", "sweet potato", "rosemary", "thyme", "olive oil"],
    blurb: "Submerge sturdy ingredients in fat at 200–250°F (95–120°C) for 2–6 hours. The vegetables are dinner; the infused oil joins your alchemist's pantry.",
    color: "ochre",
  },
  {
    name: "Waste-Not Vinaigrette",
    tagline: "3 parts oil, 1 part acid, infinite variations",
    needs: ["acid"],
    boosts: ["olive oil", "vinegar", "lemon", "mustard", "shallot", "garlic", "pickle brine", "parsley", "dill", "thyme"],
    blurb: "Whisk acid + emulsifier + sweetener + aromatics, then stream in oil. Taste, adjust, dress everything.",
    color: "ochre",
  },
  {
    name: "Alchemist's Soup",
    tagline: "From bag-of-scraps to soul food",
    needs: ["broth_base"],
    boosts: ["potato", "sweet potato", "carrot", "onion", "garlic", "chicken", "sausage", "kale", "pasta", "thyme", "parmesan"],
    blurb: "Build a base of stock + starch, simmer your scraps until tender, stir in a spoonful of rendered fat or a Parmesan rind for depth. Finish with herbs.",
    color: "rust",
  },
  {
    name: "Pantry Popcorn",
    tagline: "A canvas for flavored oils & spice blends",
    needs: ["popcorn_kernels"],
    boosts: ["butter", "olive oil", "old bay", "parmesan"],
    blurb: "Toast seasonings in hot oil with the kernels. Try infused oil for a savory backdrop. Finish with cheese or yeast off the heat.",
    color: "amber",
  },
  {
    name: "The Alchemist's Meal",
    tagline: "The foundational framework — build any plate",
    needs: [],
    boosts: ["chicken", "sausage", "steak", "potato", "rice", "confit", "sour cream", "parmesan", "salsa", "vinegar", "lemon", "parsley", "chives", "fried shallots", "nuts"],
    blurb: "The mindset behind every meal: choose a base, add a contrasting texture, play hot against cold, then finish with a burst of flavor. Not a recipe — a way of thinking about a plate.",
    color: "moss",
  },
  {
    name: "Stock from Scraps",
    tagline: "The bag in your freezer is dinner's foundation",
    needs: ["vegetable_scraps"],
    boosts: ["onion", "garlic", "carrot", "celery", "parmesan", "chicken", "thyme", "bay", "peppercorn", "mushroom"],
    blurb: "Simmer saved vegetable scraps, peels, and trimmings with aromatics low and slow, then strain. A nearly-free foundation for soups, sauces, grains, and braises — and a reason to keep that freezer bag going.",
    color: "rust",
  },
];

const TEMPLATE_DETAILS = {
  "Improvised Pesto": {
    parts: [
      { label: "The Green (2 parts)", text: "Basil is classic. Or kale, spinach, arugula, parsley, cilantro, or carrot tops. Try blends — half basil, half spinach for a milder pesto." },
      { label: "The Crunch (1 part)", text: "Pine nuts traditionally. Walnuts, pistachios, almonds, sunflower or pumpkin seeds all work. Use bold nuts (black walnuts, macadamia) sparingly." },
      { label: "The Umami (1 part)", text: "Grated Parmesan or Pecorino. Or: 1 anchovy, 1 tbsp nutritional yeast, 1 tsp white miso, 1 sun-dried tomato, or a splash of soy/tamari." },
      { label: "The Oil (1–2 parts)", text: "Good extra-virgin olive oil. Or an infused oil from another recipe. Start at 1 part, blend, then stream in more to reach your texture." },
      { label: "The Pungency", text: "1–2 garlic cloves to start. Or shallot, lemon juice, chili flakes. Fried shallots add incredible depth." },
      { label: "The Method", text: "Pulse green + crunch + umami + pungency to a coarse meal. With the machine running, slowly drizzle in oil until emulsified." },
      { label: "The Finish", text: "Taste BEFORE salting — your umami is already salty. Then crack pepper, add lemon, pulse once more." },
    ],
  },
  "Anytime Hash": {
    parts: [
      { label: "The Fat", text: "A knob of butter or a spoonful of rendered fat (bacon, chicken, steak) over medium heat." },
      { label: "The Aromatics", text: "Chopped onion, garlic, or shallot. Sauté 3–4 minutes until soft and fragrant." },
      { label: "The Starch", text: "Cooked potatoes, roasted root veg, or grains. Spread in an even layer; let it sit, undisturbed, to develop a golden crust." },
      { label: "The Protein", text: "Pulled chicken, chopped sausage, crumbled meatballs, leftover steak. Stir in and warm through, 2–3 min." },
      { label: "The Greens (optional)", text: "Fold in chopped kale or spinach until wilted. Or leftover broccoli, peppers — heat through." },
      { label: "The Egg (optional)", text: "Make wells, crack eggs in. Cover, medium-low, 3–5 min for runny yolks." },
      { label: "The Brightness", text: "Splash of apple cider or red wine vinegar, or a squeeze of lemon. A dash of hot sauce works too." },
      { label: "The Garnish", text: "Chopped parsley or chives. Fried shallots, toasted breadcrumbs, or chopped nuts for crunch." },
    ],
  },
  "Pantry Pasta": {
    parts: [
      { label: "The Pasta & Cook", text: "Cook to al dente. Reserve at least a cup of starchy pasta water before draining." },
      { label: "The Fat", text: "Olive oil for clean and peppery. Infused oil for a shortcut. Render down pancetta or bacon for smoky depth." },
      { label: "The Aromatics", text: "Garlic, onion, shallot in the warm fat. Or capers, olives, anchovy (which dissolves into pure umami)." },
      { label: "The Body", text: "Crushed tomatoes, coconut milk, or cream. ALWAYS add a splash of starchy pasta water — that's what makes the sauce silky." },
      { label: "The Umami", text: "Drop in a Parmesan rind, whisk in miso, or add rehydrated mushrooms for an earthy depth." },
      { label: "The Texture", text: "Toss the al dente pasta into the sauce to finish. Top with toasted breadcrumbs (pangrattato), nuts, or fried shallots." },
      { label: "The Freshness", text: "Off the heat: handful of parsley or basil, lemon zest, a splash of vinegar." },
      { label: "The Seasoning", text: "Taste BEFORE salting — anchovies, capers, Parmesan are already salty. Crack pepper. Drizzle your best olive oil." },
    ],
  },
  "Confit Project": {
    parts: [
      { label: "The Ingredients", text: "Sturdy is best: root veg, alliums, sturdy meats. High-water ingredients become mushy — use those for spreads or soup bases." },
      { label: "The Fat", text: "Neutral oil to highlight ingredient flavor. Olive oil for depth. Or rendered animal fat (duck in duck fat is the classic). Submerge fully." },
      { label: "The Cook", text: "Low and slow: 200–250°F (95–120°C). Oven, slow cooker on low, or stovetop on lowest heat. 2–6 hours until fork-tender." },
      { label: "The Magic", text: "The leftover oil is now liquid gold. Strain, refrigerate in a sealed jar, use as a base for dressings, sauces, or — yes — popcorn." },
      { label: "Safety Note", text: "⚠️ Low-acid ingredients (garlic, onion, peppers) in oil carry botulism risk. Always refrigerate finished confit. See storage guide for times." },
    ],
  },
  "Waste-Not Vinaigrette": {
    parts: [
      { label: "The Ratio", text: "3 parts oil to 1 part acid. That's the only rule." },
      { label: "The Oil", text: "Extra-virgin olive oil for body. Neutral oil if you want other flavors to shine. Infused oils add a layer of complexity." },
      { label: "The Acid", text: "Vinegar (cider, wine, balsamic), lemon, lime, or — a splash of pickle or olive brine for a savory kick." },
      { label: "The Emulsifier", text: "Mustard is classic — Dijon, whole grain, or yellow. Or miso paste, tahini for a savory depth." },
      { label: "The Sweetener", text: "Honey, maple syrup, a drop of molasses. Pinch of sugar dissolved into the acid first." },
      { label: "The Aromatics & Herbs", text: "Minced shallot or garlic. Finely chopped parsley, chives, dill. A pinch of dried oregano or thyme." },
      { label: "The Method", text: "Whisk everything except the oil. Stream the oil in slowly while whisking. OR: jar everything, seal, shake 15–20 sec." },
    ],
  },
  "Alchemist's Soup": {
    parts: [
      { label: "The Base", text: "Stock + a starchy base like potato, sweet potato, or pasta. Use a 'mystery stock' from your freezer — taste first to confirm it's still good." },
      { label: "The Body", text: "Whatever scraps you've saved: vegetable stems, carrot ends, kale ribs. Coarsely chopped, they break down beautifully over hours." },
      { label: "The Depth", text: "A spoonful of rendered fat (chicken, bacon) is often the missing piece. A Parmesan rind dropped in adds savory background. Miso whisked in works too." },
      { label: "The Cook", text: "Low and slow — slow cooker on low, 6–8 hours, or simmer on the stove for 1–2 hours. Taste partway through and adjust." },
      { label: "The Finish", text: "Fresh herbs at the end. A splash of vinegar or lemon to lift. Crispy croutons (even slightly burnt ones, crumbled) for texture." },
    ],
  },
  "Pantry Popcorn": {
    parts: [
      { label: "The Setup", text: "1/2 cup popping corn. Pan-coating of neutral oil + a lug of olive oil. Knob of butter. Salt, pepper, Old Bay (or your spice blend)." },
      { label: "The Method", text: "Combine kernels, salt, spices, butter in a bowl. Heat oils with 3 test kernels. When they pop, dump bowl in, cover, shake constantly." },
      { label: "The Heat", text: "Turn heat down incrementally as popping accelerates. Pull off heat at medium when pops slow to one every 1–2 sec. Tilt lid to vent steam." },
      { label: "The Variations", text: "Splash of confit oil for a warm, complex aroma. Try za'atar, garam masala, or Chinese five-spice. Toss with nutritional yeast or grated Parmesan AFTER cooking." },
    ],
  },
  "The Alchemist's Meal": {
    parts: [
      { label: "The Base", text: "Start with your centerpiece: a leftover protein (grilled sausage, pulled chicken), a preserved item from your pantry (confit, a frozen sauce), or a simple staple (dried grains, beans)." },
      { label: "The Texture", text: "Add contrast. Something crunchy — nuts, croutons, fried shallots, even potato chips. And something soft or creamy — a dollop of sour cream, creamy confit vegetables, a melting cheese." },
      { label: "The Temperature", text: "Play hot against cold. A scoop of cold salsa on hot fish; warm grilled meatballs sliced over a cool salad. The contrast is what makes a plate feel composed instead of flat." },
      { label: "The Flavor", text: "Finish with a burst. A splash of infused vinegar, a spoonful of savory relish, a sprinkle of citrus salt, a squeeze of lemon. This is where preserved and fresh items earn their keep." },
      { label: "The Mindset", text: "This isn't a recipe — it's the question to ask of any pile of ingredients: what's my base, where's the texture, can I add temperature contrast, and what lifts it at the end?" },
    ],
  },
  "Stock from Scraps": {
    parts: [
      { label: "The Scraps", text: "Your freezer bag of saved trimmings: onion skins and ends, carrot peels, celery tops, herb stems, mushroom stems, corn cobs. Hearty scraps that release flavor without turning to mush." },
      { label: "The Aromatics", text: "Add depth: a halved onion, smashed garlic, a bay leaf, a few peppercorns, sturdy herbs like thyme. A Parmesan rind or a chicken carcass turns vegetable stock into something richer." },
      { label: "The Cook", text: "Cover with cold water, bring to a bare simmer — never a hard boil, which turns stock cloudy and bitter. Hold it low for 45 min–1 hour for vegetable stock, longer with bones." },
      { label: "The Strain", text: "Pour through a fine sieve, pressing the solids to extract every bit of flavor, then discard (or compost) the spent scraps. Taste — it should taste like a savory, clean foundation." },
      { label: "The Keep", text: "Cool promptly, then refrigerate 3–4 days or freeze for months. Freeze in jars, or as cubes for small splashes. Label and date it — your future self is the one who'll use it." },
      { label: "Safety Note", text: "⚠️ Cool stock quickly — divide into shallow containers rather than leaving the whole pot on the counter. Refrigerate within two hours." },
    ],
  },
};

// Builder recipes — interactive slot-filling for templates with ratios
const BUILDER_RECIPES = {
  "Improvised Pesto": {
    yield: { default: 1, unit: "cup", label: "About 1 cup" },
    slots: [
      {
        id: "green",
        label: "The Green",
        ratio: 2,
        unit: "cups",
        helpText: "Packed leaves",
        options: [
          { name: "Basil", note: "Classic, peppery, sweet" },
          { name: "Parsley", note: "Bright, grassy" },
          { name: "Cilantro", note: "Citrusy, herbal" },
          { name: "Kale (stems removed)", note: "Earthy, robust" },
          { name: "Spinach", note: "Mild, mellowing" },
          { name: "Arugula", note: "Peppery bite" },
          { name: "Carrot tops", note: "Vegetal, zero waste" },
          { name: "Half basil + half spinach", note: "Milder, more versatile" },
        ],
      },
      {
        id: "crunch",
        label: "The Crunch",
        ratio: 1,
        unit: "cup",
        helpText: "Toasted is best",
        options: [
          { name: "Pine nuts", note: "Traditional, buttery" },
          { name: "Walnuts", note: "Earthy, slight bitterness" },
          { name: "Pistachios", note: "Sweet, vibrant green" },
          { name: "Almonds", note: "Mild, versatile" },
          { name: "Sunflower seeds", note: "Nut-free option" },
          { name: "Pumpkin seeds", note: "Nutty, hearty" },
        ],
      },
      {
        id: "umami",
        label: "The Umami",
        ratio: 1,
        unit: "cup",
        helpText: "Provides salt and savory depth",
        options: [
          { name: "Grated Parmesan", note: "Traditional, salty-nutty" },
          { name: "Grated Pecorino Romano", note: "Sharper, saltier" },
          { name: "1 anchovy fillet", note: "Dissolves into pure umami", overrideAmount: "1 fillet" },
          { name: "1 Tbsp nutritional yeast", note: "Cheesy, dairy-free", overrideAmount: "1 Tbsp" },
          { name: "1 tsp white miso paste", note: "Earthy, fermented", overrideAmount: "1 tsp" },
          { name: "1 sun-dried tomato", note: "Concentrated sweet-savory", overrideAmount: "1 piece" },
        ],
      },
      {
        id: "oil",
        label: "The Oil",
        ratio: 1,
        unit: "cup",
        helpText: "Start with this much, stream in more if needed for a smoother sauce",
        options: [
          { name: "Extra-virgin olive oil", note: "Standard, robust" },
          { name: "Confit oil", note: "From your alchemist's pantry" },
          { name: "Light olive oil + a drizzle of toasted sesame", note: "Asian-inspired twist" },
        ],
      },
      {
        id: "pungency",
        label: "The Pungency",
        ratio: 1,
        unit: "small",
        helpText: "Start small — you can always add more",
        options: [
          { name: "1–2 garlic cloves", note: "Classic, sharp", overrideAmount: "1–2 cloves" },
          { name: "1 small shallot", note: "Milder, sweeter", overrideAmount: "1 shallot" },
          { name: "1 Tbsp lemon juice + zest", note: "Bright, no allium", overrideAmount: "1 Tbsp + zest" },
          { name: "Pinch of red pepper flakes", note: "Heat instead of allium", overrideAmount: "Pinch" },
          { name: "2 Tbsp fried shallots", note: "From your pantry — incredible depth", overrideAmount: "2 Tbsp" },
        ],
      },
    ],
    method: [
      "Combine your green, crunch, umami, and pungent ingredients in a food processor.",
      "Pulse a few times to break them down into a coarse meal.",
      "With the machine running, slowly drizzle in the oil. Continue until emulsified into a paste.",
      "Taste BEFORE salting — your umami is already salty. Add a pinch of salt only if needed.",
      "Crack in pepper. Squeeze in lemon. Pulse once more to combine.",
    ],
    storage: "Refrigerate in an airtight jar up to 1 week. Pour a thin layer of oil on top to prevent browning, or freeze in ice cube trays for portioned use.",
  },
  "Waste-Not Vinaigrette": {
    yield: { default: 1, unit: "cup", label: "About 1 cup" },
    slots: [
      {
        id: "oil",
        label: "The Oil",
        ratio: 0.75,
        unit: "cup",
        helpText: "3 parts oil to 1 part acid is the foundation",
        options: [
          { name: "Extra-virgin olive oil", note: "Robust, flavorful" },
          { name: "Neutral oil (canola, grapeseed)", note: "Lets other flavors shine" },
          { name: "Confit oil from your pantry", note: "Layered complexity" },
          { name: "Half olive + half neutral", note: "Balanced" },
        ],
      },
      {
        id: "acid",
        label: "The Acid",
        ratio: 0.25,
        unit: "cup",
        helpText: "1 part acid",
        options: [
          { name: "Apple cider vinegar", note: "Fruity, mellow" },
          { name: "Red wine vinegar", note: "Sharp, tangy" },
          { name: "White wine vinegar", note: "Clean, light" },
          { name: "Balsamic vinegar", note: "Sweet, syrupy" },
          { name: "Lemon juice", note: "Bright citrus" },
          { name: "Lime juice", note: "Sharper citrus" },
          { name: "Pickle brine", note: "Savory, salty edge" },
          { name: "Olive brine", note: "Briny, complex" },
        ],
      },
      {
        id: "emulsifier",
        label: "The Emulsifier",
        ratio: 1,
        unit: "tsp",
        helpText: "Binds oil and acid together",
        options: [
          { name: "Dijon mustard", note: "Classic, tangy", overrideAmount: "1 tsp" },
          { name: "Whole grain mustard", note: "Texture and bite", overrideAmount: "1 tsp" },
          { name: "Yellow mustard", note: "Mild, simple", overrideAmount: "1 tsp" },
          { name: "Miso paste", note: "Savory depth", overrideAmount: "1/2 tsp" },
          { name: "Tahini", note: "Nutty, creamy", overrideAmount: "1 tsp" },
          { name: "Skip — keep it loose", note: "It'll separate, just shake before use", overrideAmount: "—" },
        ],
      },
      {
        id: "sweet",
        label: "The Sweetener",
        ratio: 1,
        unit: "tsp",
        helpText: "Optional — rounds out sharp acids",
        options: [
          { name: "Honey", note: "Floral, smooth", overrideAmount: "1 tsp" },
          { name: "Maple syrup", note: "Earthy sweetness", overrideAmount: "1 tsp" },
          { name: "Drop of molasses", note: "Bold, dark", overrideAmount: "1/2 tsp" },
          { name: "Skip", note: "Let the acid lead", overrideAmount: "—" },
        ],
      },
      {
        id: "aromatic",
        label: "The Aromatic",
        ratio: 1,
        unit: "small",
        helpText: "Adds savory backbone",
        options: [
          { name: "Minced shallot", note: "Mild, sweet", overrideAmount: "1 small" },
          { name: "Minced garlic", note: "Sharp, classic", overrideAmount: "1 clove" },
          { name: "Grated onion", note: "Quick alternative", overrideAmount: "1 Tbsp" },
          { name: "Fried shallots from your pantry", note: "Deeper, sweeter", overrideAmount: "1 Tbsp" },
          { name: "Skip", note: "Let the herbs lead", overrideAmount: "—" },
        ],
      },
      {
        id: "herb",
        label: "The Herb",
        ratio: 2,
        unit: "Tbsp",
        helpText: "Finely chopped, fresh if you have it",
        options: [
          { name: "Parsley", note: "Bright, clean" },
          { name: "Chives", note: "Mild oniony" },
          { name: "Dill", note: "Bright, anise-y" },
          { name: "Cilantro", note: "Citrusy" },
          { name: "Pinch of dried oregano", note: "Earthy, Mediterranean" },
          { name: "Pinch of dried thyme", note: "Warm, woodsy" },
          { name: "Skip", note: "Keep it simple" },
        ],
      },
    ],
    method: [
      "Whisk option A: Combine everything except oil in a small bowl. Whisk while slowly drizzling in oil.",
      "Or jar option B: Combine all ingredients in a jar with a tight lid. Shake vigorously 15–20 sec.",
      "Taste — adjust salt, acid, or sweetness to your liking.",
      "Crack in black pepper to finish.",
    ],
    storage: "Refrigerate in a sealed jar up to 1 week. Shake before each use if it separates.",
  },
  "Pantry Popcorn": {
    yield: { default: 1, unit: "batch", label: "1 batch (about 8 cups popped)" },
    slots: [
      {
        id: "kernels",
        label: "The Kernels",
        ratio: 0.5,
        unit: "cup",
        helpText: "Standard popping corn",
        options: [
          { name: "Yellow popcorn", note: "Classic, bigger flake" },
          { name: "White popcorn", note: "Tender, smaller flake" },
          { name: "Mushroom popcorn", note: "Round, holds toppings well" },
        ],
      },
      {
        id: "oil",
        label: "The Oil",
        ratio: 3,
        unit: "Tbsp",
        helpText: "Half neutral, half flavorful is the sweet spot",
        options: [
          { name: "All neutral oil (canola, sunflower)", note: "Classic, clean" },
          { name: "Half neutral + half olive oil", note: "Dad's 'famous' starting point" },
          { name: "Half neutral + half confit oil", note: "Warm, complex aroma" },
          { name: "Coconut oil", note: "Subtle sweetness" },
        ],
      },
      {
        id: "fat",
        label: "The Fat",
        ratio: 1.5,
        unit: "Tbsp",
        helpText: "Goes IN the pan with the kernels",
        options: [
          { name: "Butter", note: "Classic, rich", overrideAmount: "1.5 Tbsp" },
          { name: "Ghee", note: "No burning, rich", overrideAmount: "1.5 Tbsp" },
          { name: "Skip", note: "Lighter result", overrideAmount: "—" },
        ],
      },
      {
        id: "spice",
        label: "The Spice Blend",
        ratio: 1,
        unit: "tsp",
        helpText: "Toasted with the kernels for full distribution",
        options: [
          { name: "Old Bay", note: "Dad's choice — celery salt, paprika, spices", overrideAmount: "1–2 tsp" },
          { name: "Za'atar", note: "Sumac, sesame, thyme", overrideAmount: "1 tsp" },
          { name: "Garam masala", note: "Warm, complex", overrideAmount: "3/4 tsp" },
          { name: "Chinese five-spice", note: "Sweet, warm, anise", overrideAmount: "1/2 tsp" },
          { name: "Smoked paprika + cayenne", note: "Smoky with heat", overrideAmount: "1 tsp + pinch" },
          { name: "Just salt and pepper", note: "Pure, simple", overrideAmount: "Pinch each" },
        ],
      },
      {
        id: "finish",
        label: "The Finish",
        ratio: 1,
        unit: "small",
        helpText: "Tossed AFTER cooking — never in the hot pan",
        options: [
          { name: "Nutritional yeast", note: "Cheesy, vegan", overrideAmount: "1–2 Tbsp" },
          { name: "Grated Parmesan", note: "Salty, savory", overrideAmount: "2 Tbsp" },
          { name: "Grated Pecorino", note: "Sharper than Parm", overrideAmount: "2 Tbsp" },
          { name: "Lemon zest + flaky salt", note: "Bright, light", overrideAmount: "1 lemon + pinch" },
          { name: "Skip", note: "Let the spice shine", overrideAmount: "—" },
        ],
      },
    ],
    method: [
      "Combine kernels, fat, salt, and spice blend in a bowl. Set aside.",
      "Add oils to a heavy-bottomed pan with a lid. Add 3 test kernels and heat over high.",
      "When the test kernels pop, dump the bowl in, cover immediately, and shake the pan.",
      "Keep shaking constantly. Turn heat down incrementally as popping accelerates.",
      "Pull off heat when popping slows to one every 1–2 sec. Tilt lid slightly to vent steam.",
      "Pour into a large bowl. Add finishing ingredients and toss. Serve immediately.",
    ],
    storage: "Best eaten immediately. The infused oil left in the pan can be strained and saved for next time.",
  },
  "Pantry Pasta": {
    yield: { default: 1, unit: "serving", label: "2 servings" },
    slots: [
      {
        id: "pasta",
        label: "The Pasta",
        ratio: 8,
        unit: "oz",
        helpText: "Cook to al dente — reserve a cup of starchy water before draining",
        options: [
          { name: "Spaghetti or linguine", note: "Long, twirlable, oil-friendly" },
          { name: "Fettuccine or tagliatelle", note: "Wider, holds creamy sauces" },
          { name: "Penne or fusilli", note: "Tubes and twists for chunky sauces" },
          { name: "Casarecce or orecchiette", note: "Catches every bit of pesto" },
          { name: "Rigatoni", note: "Hearty, tomato-friendly" },
        ],
      },
      {
        id: "fat",
        label: "The Fat",
        ratio: 3,
        unit: "Tbsp",
        helpText: "Where flavor begins",
        options: [
          { name: "Extra-virgin olive oil", note: "Clean, peppery foundation" },
          { name: "Confit oil from your pantry", note: "Layered shortcut" },
          { name: "Tuna or anchovy oil from a tin", note: "Built-in umami" },
          { name: "Diced pancetta or bacon", note: "Render down for smoky depth" },
          { name: "Rendered fat (chicken, bacon)", note: "Deep, savory" },
        ],
      },
      {
        id: "aromatic",
        label: "The Aromatic",
        ratio: 1,
        unit: "small",
        helpText: "Bloom in the warm fat",
        options: [
          { name: "2 cloves minced garlic", note: "Classic", overrideAmount: "2 cloves" },
          { name: "1 small shallot, minced", note: "Sweeter, milder", overrideAmount: "1 shallot" },
          { name: "2 Tbsp capers", note: "Briny pop", overrideAmount: "2 Tbsp" },
          { name: "1–2 anchovies", note: "Dissolve into umami", overrideAmount: "1–2 fillets" },
          { name: "1 Tbsp tomato paste", note: "Sweet-savory, toast until brick-red", overrideAmount: "1 Tbsp" },
        ],
      },
      {
        id: "body",
        label: "The Body",
        ratio: 1,
        unit: "cup",
        helpText: "The liquid that brings it together — always with starchy pasta water",
        options: [
          { name: "Crushed canned tomatoes", note: "Classic red sauce" },
          { name: "Diced tomatoes (crush yourself)", note: "Chunkier texture" },
          { name: "Heavy cream", note: "Rich, creamy, indulgent" },
          { name: "Coconut milk (full-fat)", note: "Dairy-free creaminess" },
          { name: "Just olive oil + pasta water", note: "Aglio e olio style — minimal" },
        ],
      },
      {
        id: "umami",
        label: "The Umami",
        ratio: 1,
        unit: "small",
        helpText: "Adds savory background",
        options: [
          { name: "Parmesan rind from your pantry", note: "Drop in, simmer, remove or eat", overrideAmount: "1 rind" },
          { name: "1 tsp white miso paste", note: "Whisk in with warm pasta water", overrideAmount: "1 tsp" },
          { name: "Dried mushrooms (rehydrated)", note: "Earthy depth", overrideAmount: "Small handful" },
          { name: "Splash of soy sauce", note: "Quick umami hit", overrideAmount: "1 tsp" },
          { name: "Skip", note: "Let other flavors lead", overrideAmount: "—" },
        ],
      },
      {
        id: "texture",
        label: "The Texture",
        ratio: 0.25,
        unit: "cup",
        helpText: "Crunchy contrast added at the end",
        options: [
          { name: "Toasted breadcrumbs (pangrattato)", note: "Poor man's Parmesan" },
          { name: "Toasted walnuts or pine nuts", note: "Rich, nutty crunch" },
          { name: "Fried shallots from your pantry", note: "Sweet, crispy depth" },
          { name: "Crushed potato chips or pretzels", note: "Salty, no-fuss" },
          { name: "Skip", note: "Sometimes simpler is better" },
        ],
      },
      {
        id: "freshness",
        label: "The Freshness",
        ratio: 1,
        unit: "Tbsp",
        helpText: "Off the heat — brightens everything",
        options: [
          { name: "Chopped parsley", note: "Bright, clean" },
          { name: "Chopped basil", note: "Sweet, classic" },
          { name: "Lemon zest + juice", note: "Wakes up rich sauces" },
          { name: "Chopped mint", note: "Surprising, refreshing" },
          { name: "Splash of red wine vinegar", note: "Acid without herbs" },
        ],
      },
    ],
    method: [
      "Cook pasta to al dente. Reserve at least 1 cup of starchy pasta water before draining.",
      "While pasta cooks, gently heat fat in a large skillet over medium-low.",
      "Add aromatics and cook until soft and fragrant (3–4 min). Don't brown.",
      "Add umami element (rind, miso, mushrooms) and bloom for 30 sec.",
      "Add the body — crushed tomatoes, cream, or just oil — plus a generous splash of pasta water. Simmer 5 min to combine.",
      "Add the al dente pasta directly to the sauce. Toss vigorously, adding pasta water as needed for silky coating.",
      "Top with texture and freshness. Crack pepper. Taste before salting — capers, anchovy, and Parmesan are already salty.",
    ],
    storage: "Best fresh. Leftovers refrigerate 3–5 days; refresh with a splash of pasta water or olive oil when reheating.",
  },
  "Anytime Hash": {
    yield: { default: 1, unit: "serving", label: "2 servings" },
    slots: [
      {
        id: "fat",
        label: "The Fat",
        ratio: 2,
        unit: "Tbsp",
        helpText: "Medium heat, then add aromatics",
        options: [
          { name: "Butter", note: "Classic, rich" },
          { name: "Bacon fat", note: "Smoky depth" },
          { name: "Chicken fat (schmaltz)", note: "Savory, golden" },
          { name: "Olive oil + a pat of butter", note: "Best of both" },
          { name: "Rendered steak fat", note: "Beefy, bold" },
        ],
      },
      {
        id: "aromatic",
        label: "The Aromatic",
        ratio: 1,
        unit: "medium",
        helpText: "Sauté 3–4 minutes until soft",
        options: [
          { name: "Diced onion", note: "Sweet base", overrideAmount: "1 medium" },
          { name: "Diced shallot", note: "More refined", overrideAmount: "2 shallots" },
          { name: "Minced garlic", note: "Pungent, sharp", overrideAmount: "3 cloves" },
          { name: "Onion + garlic", note: "Both worlds", overrideAmount: "1 + 2 cloves" },
          { name: "Leeks (white + light green)", note: "Mild, oniony", overrideAmount: "1 leek" },
        ],
      },
      {
        id: "starch",
        label: "The Starch",
        ratio: 2,
        unit: "cups",
        helpText: "Cooked, diced. Spread in even layer and let crisp before stirring.",
        options: [
          { name: "Diced cooked potatoes", note: "Classic" },
          { name: "Diced sweet potato", note: "Sweet, hearty" },
          { name: "Cooked quinoa or farro", note: "Faster, lighter" },
          { name: "Roasted root vegetables (any)", note: "Use what you have" },
          { name: "Leftover rice", note: "Day-old works best" },
        ],
      },
      {
        id: "protein",
        label: "The Protein",
        ratio: 1,
        unit: "cup",
        helpText: "Already cooked — heat through 2–3 min",
        options: [
          { name: "Pulled chicken", note: "From last night's roast" },
          { name: "Chopped sausage", note: "Adds spice and fat" },
          { name: "Crumbled meatballs", note: "Saves the leftovers" },
          { name: "Diced steak", note: "Rare to medium holds up best" },
          { name: "Black or white beans", note: "Vegetarian, hearty" },
          { name: "Skip", note: "Veggie hash" },
        ],
      },
      {
        id: "greens",
        label: "The Greens",
        ratio: 2,
        unit: "cups",
        helpText: "Fold in until just wilted",
        options: [
          { name: "Chopped kale", note: "Holds up to heat" },
          { name: "Spinach", note: "Wilts in seconds" },
          { name: "Leftover broccoli", note: "Reheat-friendly" },
          { name: "Chopped bell peppers", note: "Sweet, colorful" },
          { name: "Skip", note: "Keep it simple" },
        ],
      },
      {
        id: "egg",
        label: "The Egg (optional)",
        ratio: 2,
        unit: "eggs",
        helpText: "Make wells, crack in, cover, low heat 3–5 min",
        options: [
          { name: "Crack 2 eggs into wells (runny yolks)", note: "Classic", overrideAmount: "2 eggs" },
          { name: "Crack 2 eggs (firm yolks)", note: "Cook 5–7 min", overrideAmount: "2 eggs" },
          { name: "Soft-scrambled eggs folded in", note: "Mixed throughout", overrideAmount: "2 eggs" },
          { name: "Skip", note: "Save the eggs", overrideAmount: "—" },
        ],
      },
      {
        id: "brightness",
        label: "The Brightness",
        ratio: 1,
        unit: "splash",
        helpText: "Cuts through richness at the end",
        options: [
          { name: "Splash of apple cider vinegar", note: "Fruity, clean", overrideAmount: "1 tsp" },
          { name: "Splash of red wine vinegar", note: "Sharp", overrideAmount: "1 tsp" },
          { name: "Squeeze of lemon", note: "Bright citrus", overrideAmount: "1/2 lemon" },
          { name: "Dash of hot sauce", note: "Heat + acid", overrideAmount: "Several dashes" },
          { name: "Skip", note: "Simple", overrideAmount: "—" },
        ],
      },
      {
        id: "garnish",
        label: "The Garnish",
        ratio: 2,
        unit: "Tbsp",
        helpText: "Final layer of texture and freshness",
        options: [
          { name: "Chopped parsley or chives", note: "Bright, herbal" },
          { name: "Fried shallots from your pantry", note: "Sweet crunch" },
          { name: "Toasted breadcrumbs", note: "Crispy texture" },
          { name: "Crumbled cheese (feta, goat)", note: "Creamy, tangy" },
          { name: "Sliced avocado", note: "Cool, creamy" },
          { name: "Skip", note: "Plate it up" },
        ],
      },
    ],
    method: [
      "Heat fat in a large skillet over medium heat.",
      "Add aromatics. Sauté 3–4 min until softened and fragrant.",
      "Add the starch. Spread in an even layer; let cook undisturbed for 4–5 min to develop a golden, crispy crust.",
      "Stir, then add protein. Cook 2–3 min to warm through.",
      "Fold in greens or extra vegetables. Cook until just wilted or heated through.",
      "If using eggs: make wells, crack eggs in, cover, reduce to medium-low. Cook 3–5 min for runny yolks.",
      "Splash on the brightness. Top with garnish. Serve hot, straight from the pan.",
    ],
    storage: "Best fresh from the pan. Leftovers refrigerate 2–3 days but the texture suffers — reheat in a dry pan, not the microwave.",
  },
  "Confit Project": {
    yield: { default: 1, unit: "batch", label: "1 jar (about 2 cups + the gold oil)" },
    slots: [
      {
        id: "ingredient",
        label: "The Ingredient",
        ratio: 2,
        unit: "cups",
        helpText: "Sturdy is best — root veg, alliums, sturdy meats",
        options: [
          { name: "Whole garlic cloves (peeled)", note: "Classic — sweet, spreadable" },
          { name: "Cherry tomatoes (whole)", note: "Bursting, jammy" },
          { name: "Carrots (large dice)", note: "Sweet, tender" },
          { name: "Shallots (peeled, halved)", note: "Caramelized, deep" },
          { name: "Apples + parsnips + carrots", note: "mg's autumn classic" },
          { name: "Chicken thighs (skin-on, bone-in)", note: "Rich, fall-off-the-bone" },
          { name: "Pork shoulder (cubed)", note: "Slow-cooked, shred-ready" },
        ],
      },
      {
        id: "fat",
        label: "The Fat",
        ratio: 2,
        unit: "cups",
        helpText: "Must fully submerge the ingredient",
        options: [
          { name: "Neutral oil (canola, sunflower)", note: "Lets ingredient flavors shine" },
          { name: "Olive oil", note: "Adds depth and character" },
          { name: "Half olive + half neutral", note: "Balanced" },
          { name: "Duck or chicken fat (rendered)", note: "Traditional for poultry confit" },
          { name: "Pork lard", note: "Best with pork or beans" },
        ],
      },
      {
        id: "aromatic",
        label: "The Aromatic",
        ratio: 4,
        unit: "items",
        helpText: "Adds layered flavor — they'll perfume the oil too",
        options: [
          { name: "Sprigs of thyme + rosemary", note: "Woodsy, classic" },
          { name: "Bay leaves + black peppercorns", note: "Savory, traditional" },
          { name: "Cinnamon stick + cloves + allspice", note: "Warm, autumnal (mg's favorite)" },
          { name: "Star anise + Sichuan peppercorns", note: "Asian-leaning, complex" },
          { name: "Lemon peel + dried chili", note: "Bright, with heat" },
          { name: "Skip aromatics", note: "Let the ingredient lead" },
        ],
      },
      {
        id: "salt",
        label: "The Salt",
        ratio: 1,
        unit: "tsp",
        helpText: "Seasons the ingredient and the oil",
        options: [
          { name: "Kosher salt", note: "Standard, clean" },
          { name: "Sea salt", note: "Slightly mineral" },
          { name: "Smoked salt", note: "Adds a faint smokiness" },
        ],
      },
    ],
    method: [
      "Combine ingredient, aromatics, and salt in an oven-safe dish, slow cooker, or heavy pot.",
      "Cover completely with fat. Everything must be submerged — top up with more oil if needed.",
      "Cook low and slow: 200–250°F (95–120°C). Oven works, slow cooker on low works, stovetop on lowest heat works.",
      "Cook until fork-tender: 1–2 hours for vegetables, 2–4 for fish, 3–6 for meat.",
      "Cool to room temperature in the fat. Transfer to a clean jar with the ingredient fully submerged.",
      "When you use the ingredient, save the strained oil — it's now infused liquid gold for your alchemist's pantry.",
    ],
    storage: "Refrigerate fully submerged in fat. Vegetable confit: 2–3 weeks. Meat confit: up to 1 month. ⚠️ Fresh garlic in oil carries botulism risk — must stay refrigerated and used within several weeks.",
  },
  "Alchemist's Soup": {
    yield: { default: 1, unit: "pot", label: "About 4 servings" },
    slots: [
      {
        id: "fat",
        label: "The Fat",
        ratio: 2,
        unit: "Tbsp",
        helpText: "Where the foundation begins",
        options: [
          { name: "Olive oil", note: "Clean, classic" },
          { name: "Butter", note: "Rich, mellow" },
          { name: "Rendered chicken or bacon fat", note: "Savory backbone" },
          { name: "Confit oil from your pantry", note: "Layered shortcut" },
        ],
      },
      {
        id: "aromatic",
        label: "The Aromatic",
        ratio: 1,
        unit: "medium",
        helpText: "Sauté in fat until soft (5 min)",
        options: [
          { name: "Diced onion + garlic", note: "Foundational duo", overrideAmount: "1 onion + 2 cloves" },
          { name: "Leeks (white + light green)", note: "Mellow, sweet", overrideAmount: "2 leeks" },
          { name: "Shallots + garlic", note: "More refined", overrideAmount: "3 shallots + 2 cloves" },
          { name: "Mirepoix (onion + carrot + celery)", note: "Classic French base", overrideAmount: "1 cup total" },
        ],
      },
      {
        id: "starch",
        label: "The Starch",
        ratio: 2,
        unit: "cups",
        helpText: "Bulks up the soup, becomes tender as it simmers",
        options: [
          { name: "Diced potatoes", note: "Classic, creamy when blended" },
          { name: "Sweet potato", note: "Sweet, golden" },
          { name: "White beans (canned, drained)", note: "Hearty, creamy" },
          { name: "Cooked pasta (added at the end)", note: "Quick, satisfying" },
          { name: "Cooked rice or grains", note: "Weighty, filling" },
          { name: "Skip", note: "Lighter broth-style soup" },
        ],
      },
      {
        id: "scraps",
        label: "The Vegetables/Scraps",
        ratio: 3,
        unit: "cups",
        helpText: "Coarsely chopped — they'll soften over hours",
        options: [
          { name: "Frozen vegetable scrap bag from your pantry", note: "What this template is FOR" },
          { name: "Carrots, celery, fennel — roughly chopped", note: "Sturdy, sweet" },
          { name: "Kale or chard stems + tough greens", note: "Earthy, hearty" },
          { name: "Mushrooms (any kind)", note: "Umami-rich" },
          { name: "Cabbage, leek tops, fennel fronds", note: "Use up the odd bits" },
        ],
      },
      {
        id: "liquid",
        label: "The Liquid",
        ratio: 6,
        unit: "cups",
        helpText: "Cover everything, then a couple inches more",
        options: [
          { name: "Mystery stock from your pantry", note: "Used the way it was meant" },
          { name: "Chicken stock", note: "Standard, reliable" },
          { name: "Vegetable stock", note: "Lighter, vegetarian" },
          { name: "Half stock + half water", note: "Stretches stock" },
          { name: "Dashi (Japanese stock)", note: "Different direction, more umami" },
        ],
      },
      {
        id: "depth",
        label: "The Depth",
        ratio: 1,
        unit: "small",
        helpText: "The book's secret weapon",
        options: [
          { name: "Spoonful of rendered fat from your pantry", note: "mg's missing-ingredient", overrideAmount: "1/4 cup" },
          { name: "Parmesan rind from your pantry", note: "Drop in, simmer, remove", overrideAmount: "1 rind" },
          { name: "1 Tbsp miso paste (whisked in late)", note: "Earthy umami", overrideAmount: "1 Tbsp" },
          { name: "Splash of soy or fish sauce", note: "Quick depth", overrideAmount: "1 Tbsp" },
          { name: "Tomato paste", note: "Bloom in fat first", overrideAmount: "1 Tbsp" },
        ],
      },
      {
        id: "finish",
        label: "The Finish",
        ratio: 1,
        unit: "small",
        helpText: "Off the heat — brightens, lifts",
        options: [
          { name: "Splash of vinegar (apple cider, red wine)", note: "Cuts the richness", overrideAmount: "1 Tbsp" },
          { name: "Squeeze of lemon", note: "Bright citrus", overrideAmount: "1/2 lemon" },
          { name: "Chopped fresh herbs", note: "Parsley, dill, chives", overrideAmount: "2 Tbsp" },
          { name: "Drizzle of olive oil + crumbled scones", note: "mg's accidental crouton trick", overrideAmount: "to taste" },
          { name: "Yogurt or sour cream dollop", note: "Cooling, creamy", overrideAmount: "to taste" },
        ],
      },
    ],
    method: [
      "Heat fat in a large pot over medium heat.",
      "Sauté aromatics until soft and fragrant, 4–5 min.",
      "Add starch and scrap vegetables. Stir to coat in fat.",
      "Pour in liquid. Bring to a boil, then reduce to a simmer.",
      "Stir in the depth element (rendered fat, Parmesan rind, miso). Simmer covered for 1–2 hours, or slow cooker on low 6–8 hours.",
      "Taste partway through. If flat, add another spoonful of depth element. If too thick, add water.",
      "Off the heat, stir in the finish — vinegar, lemon, or herbs. Crack pepper. Salt only if needed.",
    ],
    storage: "Refrigerate 3–4 days, freeze 2–3 months. Tastes even better on day 2.",
  },
};

// Story snippets — pulled from the book to surface alongside templates
const TEMPLATE_STORIES = {
  "Improvised Pesto": {
    title: "The Lost Jar",
    text: "I had carefully prepared a seafood-shallot oil to use for an umami-rich pesto. But my wife mistook the cooling liquid for an empty pickle jar and poured the contents out to recycle the glass. The pesto as I had envisioned it now felt impossible. But I still had the umami-rich fried shallots, so I improvised — blending them with fresh basil, pine nuts, pistachios, and young garlic, with a single anchovy to make up for the lost umami. The result was a pesto with a subtle, savory depth you couldn't replicate with a standard recipe. A flavor born from loss, instinct, and the power of using what you have.",
    chapter: "Chapter II — The Foundations of Flavor",
  },
  "Pantry Pasta": {
    title: "The Anatomy of a Great Sandwich",
    text: "My starting point was a small amount of pastrami-cured salmon. Its flavors were rich, salty, and peppery — intense and one-dimensional alone. By thinking through the principles of balance — acid for the richness, bitter kale for contrast, capers and cream cheese to bind it all — leftovers became a cohesive, sublime meal. The same logic applies to pasta: build flavor in stages, use what you have, and trust the process.",
    chapter: "Chapter V — Flavor Pairing and Substitution",
  },
  "Anytime Hash": {
    title: "Steak-and-Eggs Improvisation",
    text: "After a surf-and-turf cookout, the leftovers — steak, potatoes, and forgotten roasted peppers — became a spicy relish for a steak-and-eggs breakfast with smashed potatoes and recently-fried shallots as a savory garnish. Hash is what happens when you stop seeing leftovers as an end and start seeing them as a beginning.",
    chapter: "Chapter II — The Foundations of Flavor",
  },
  "Confit Project": {
    title: "Apples, Parsnips, and Liquid Gold",
    text: "I was in the middle of a 'confit everything' phase when I threw apples the kids hadn't eaten, languishing parsnips, and a few carrots into my slow cooker with neutral oil, garlic, a cinnamon stick, cloves, allspice, and peppercorns. The vegetables were a tender side dish — but the real magic was the oil. It had taken on the essence of everything it touched. Golden, complex, far too valuable to discard. That oil became the unexpected hero of a popcorn night that my oldest daughter declared her absolute favorite, never to be topped.",
    chapter: "Chapter III — The Resourceful Mindset",
  },
  "Waste-Not Vinaigrette": {
    title: "The Lemon Perrier Marinade",
    text: "One evening, I needed to marinate a chicken breast and had no lemons. A jar of butter pickles and a flat bottle of lemon Perrier sat next to it in the fridge. I knew pickle brine would tenderize, and I hoped the lemon water would brighten. The result was flavorful, tender chicken from a last-minute decision to use what was already there. Vinaigrettes work the same way — the principles matter more than the specific ingredients.",
    chapter: "Chapter III — The Resourceful Mindset",
  },
  "Alchemist's Soup": {
    title: "The Bag of Stems and Chives",
    text: "It was a soup born not from a recipe but from a motley collection of vegetable stems and chives in my freezer. After 6 hours of slow cooking, the soup was missing depth — until I stirred in a quarter cup of rendered chicken fat from my alchemist's pantry. It was the ingredient the soup was missing. A testament to the transformative power of a well-stocked pantry: a collection of seemingly unrelated afterthoughts can become the foundation for something truly satisfying.",
    chapter: "Chapter VI — The Alchemy of Transformation",
  },
  "Pantry Popcorn": {
    title: "Dad's 'Legendary' Popcorn",
    text: "One night we were out of olive oil. The kids wanted popcorn. Lacking my usual base, I took a chance with the apple-parsnip-carrot oil I'd jarred from a confit. As the kernels began to pop, the kitchen filled with a warm, complex aroma of sweet apple and earthy parsnip. My oldest daughter declared the new recipe her absolute favorite, which has yet to be topped.",
    chapter: "Chapter III — The Resourceful Mindset",
  },
  "The Alchemist's Meal": {
    title: "Every Plate, the Same Question",
    text: "From a backyard crab feast to a last-minute steak-and-eggs breakfast, the same instinct runs through every meal in this book: choose a base, find a contrasting texture, play warm against cool, and finish with something bright. It's the difference between simply following steps and cooking with intuition — having a creative conversation with what you have and what you know.",
    chapter: "Appendix V — The Alchemist's Templates",
  },
  "Stock from Scraps": {
    title: "The Freezer Bag That Becomes Dinner",
    text: "I keep a bag in the freezer — carrot ends and peels, onion skins, herb stems, the ribs of kale. On their own, they're trimmings most people toss. Simmered low with a few aromatics and strained, they become a savory foundation that costs almost nothing and asks only that I'd had the foresight to save them. The simple, unseen work you do today makes delicious, improvised meals possible tomorrow.",
    chapter: "Chapter III — The Resourceful Mindset",
  },
};

// Ingredient deep-dives — explain ingredients that may be unfamiliar, link them to the rest of the app
// Match keys are case-insensitive substrings of ingredient/scrap names
const INGREDIENT_DEEP_DIVES = {
  "Anchovy": {
    name: "Anchovies",
    role: "Umami builder",
    whatItIs: "Small, oily fish cured in salt and packed in oil or paste. They taste briny and intense straight out of the tin, but here's the magic: when cooked or blended into a dish, they dissolve completely and disappear, leaving behind only deep savory richness. No fishiness, just umami.",
    whereToFind: "Canned aisle, near the tuna and sardines. Brands like Ortiz and Cento are reliably good. Anchovy paste in a tube works too and lasts longer once opened.",
    howToUse: [
      "Melt 1–2 fillets into hot olive oil at the start of a pasta sauce — they'll dissolve into the fat",
      "Mince and stir into vinaigrettes for instant savory depth",
      "Add one to a pesto in place of (or alongside) Parmesan for unbeatable umami",
      "Smash into compound butter for steaks or roasted vegetables",
    ],
    howToStore: "Refrigerate after opening, with all fillets submerged in oil. Will keep up to 2 months.",
    substitutes: ["Worcestershire sauce", "Soy sauce", "Miso paste", "Fish sauce"],
    usedIn: ["Improvised Pesto", "Pantry Pasta", "Waste-Not Vinaigrette"],
  },
  "Old Bay": {
    name: "Old Bay Seasoning",
    role: "Spice blend",
    whatItIs: "A Chesapeake Bay-area spice blend originally created for steamed crabs in 1939 by a German immigrant in Baltimore. The mix is celery salt, paprika, mustard, pepper, and warm spices like cardamom, cinnamon, and clove. It tastes savory, peppery, slightly sweet, and unmistakably regional.",
    whereToFind: "Spice aisle in most US grocery stores. Internationally, look for it at specialty shops or order online from McCormick.",
    howToUse: [
      "Toss with popcorn kernels and oil before popping (Dad's classic)",
      "Sprinkle on roasted potatoes or sweet potato fries",
      "Season seafood, eggs, or even fried chicken",
      "Add a pinch to compound butter or a deviled egg filling",
    ],
    howToStore: "Pantry, in its original tin, for up to 2 years. Replace when the aroma fades.",
    substitutes: ["2 parts celery salt + 2 parts paprika + 1 part black pepper + 1 part cayenne (homemade approximation)"],
    usedIn: ["Pantry Popcorn"],
  },
  "Urfa Pepper": {
    name: "Urfa Biber (Urfa Pepper)",
    role: "Spice",
    whatItIs: "A Turkish chili pepper that's sun-dried during the day and wrapped tightly at night to sweat. The result is dark burgundy flakes with a smoky, raisiny, almost chocolatey flavor and gentle heat — completely different from a generic chili flake.",
    whereToFind: "Specialty spice shops, Middle Eastern grocers, or online (Burlap & Barrel, Spicewalla, Kalustyan's).",
    howToUse: [
      "Sprinkle on grilled meats and seafood (mg uses it on shrimp skewers)",
      "Stir into yogurt or labneh for a dip",
      "Mix into compound butter or finishing oil",
      "Toss with roasted vegetables, especially squash or eggplant",
    ],
    howToStore: "Cool, dark pantry in an airtight container. Best within 1 year for full flavor.",
    substitutes: ["Aleppo pepper (similar character, slightly brighter)", "Smoked paprika + a pinch of cayenne"],
    usedIn: [],
  },
  "Parmesan": {
    name: "Parmesan & its Rinds",
    role: "Umami builder",
    whatItIs: "An aged Italian cow's-milk cheese (proper Parmigiano-Reggiano is from a specific region in Italy). It's salty, nutty, and intensely savory. The hard outer rind is often discarded, but it's a flavor goldmine — keep every one you finish.",
    whereToFind: "Cheese counter or refrigerated cheese section. Authentic Parmigiano-Reggiano has the name stamped into the rind. Pecorino Romano is a sharper, saltier cousin made from sheep's milk.",
    howToUse: [
      "Grate fresh into pastas, soups, salads, scrambled eggs",
      "Drop a rind into simmering soups or sauces — pull it out before serving (or eat it, slightly chewy)",
      "Blend into pesto for traditional umami",
      "Toss with hot popcorn for instant cheese popcorn",
    ],
    howToStore: "Wedge: refrigerated, wrapped in parchment then loose plastic, up to 1 month. Rinds: freeze tightly wrapped, 1+ year.",
    substitutes: ["Pecorino Romano", "Grana Padano", "Nutritional yeast (dairy-free)", "Anchovy (different flavor, similar umami)"],
    usedIn: ["Improvised Pesto", "Pantry Pasta", "Pantry Popcorn", "Alchemist's Soup"],
  },
  "Miso": {
    name: "Miso Paste",
    role: "Umami builder",
    whatItIs: "Fermented soybean paste from Japan. White (shiro) is mild and sweet; red (aka) is bolder and saltier. A spoonful adds incredible savory depth and a subtle fermented funk that lingers pleasantly.",
    whereToFind: "Refrigerated section of most grocery stores, near the tofu. Asian markets carry the widest selection.",
    howToUse: [
      "Whisk into vinaigrettes (use white miso, ½ tsp to start)",
      "Stir into soup broth at the end (don't boil, or it loses its character)",
      "Mix into compound butter for steaks or vegetables",
      "Use as an umami substitute in pesto",
    ],
    howToStore: "Refrigerated in its original tub or transferred to a sealed jar. Lasts up to a year — it's already fermented.",
    substitutes: ["Soy sauce + a pinch of sugar", "Anchovy paste (different but similar role)", "Tahini + soy sauce (vegan)"],
    usedIn: ["Improvised Pesto", "Pantry Pasta", "Waste-Not Vinaigrette"],
  },
  "Nutritional Yeast": {
    name: "Nutritional Yeast",
    role: "Umami builder (dairy-free)",
    whatItIs: "Deactivated yellow yeast flakes that taste cheesy, nutty, and savory. Vegan cooks call it 'nooch.' It's a complete protein and packed with B vitamins, but mostly it's just the easiest way to add cheesy flavor without dairy.",
    whereToFind: "Health food aisle or bulk bins. Bob's Red Mill and Bragg are common brands.",
    howToUse: [
      "Sprinkle on hot popcorn (1–2 Tbsp per batch)",
      "Stir into pesto in place of Parmesan (1 Tbsp = 1 part)",
      "Blend into vegan cheese sauces or creamy dressings",
      "Toss with roasted vegetables or pasta",
    ],
    howToStore: "Pantry in a sealed container, away from light. Lasts 1+ year.",
    substitutes: ["Grated Parmesan or Pecorino", "Anchovy (different but similar role)"],
    usedIn: ["Improvised Pesto", "Pantry Popcorn"],
  },
  "Capers": {
    name: "Capers",
    role: "Briny finisher",
    whatItIs: "The unopened flower buds of a Mediterranean shrub, picked tiny, dried, and brined or salt-cured. They taste sharp, briny, slightly floral, and tangy — a small handful transforms a dish.",
    whereToFind: "Olive aisle in most grocery stores. Smaller capers ('nonpareil') are more refined; larger ones ('caperberries') are funkier.",
    howToUse: [
      "Chop and mix into cream cheese with their brine for a salmon spread",
      "Toss into pasta sauces with anchovy and garlic",
      "Add to vinaigrettes for a savory bite",
      "Fry in oil briefly until they bloom — incredible crispy garnish",
    ],
    howToStore: "Refrigerate after opening, fully submerged in their brine. Last 6+ months.",
    substitutes: ["Chopped green olives", "Pickled green peppercorns", "Brined nasturtium seeds (if you have them)"],
    usedIn: ["Pantry Pasta"],
  },
  "Pickle Brine": {
    name: "Pickle Brine",
    role: "Acid + salt + flavor",
    whatItIs: "The leftover liquid from a jar of pickles. It's the unsung hero of the alchemist's pantry: an acidic, salty, herby, often-garlicky flavor base you'd otherwise pour down the drain. Different pickles yield different brines — dill, bread-and-butter, half-sour, spicy — each with its own character.",
    whereToFind: "Already in your fridge if you eat pickles. Don't throw it away.",
    howToUse: [
      "Marinate chicken, pork, or fish in it overnight — tenderizes and seasons in one step",
      "Splash into vinaigrettes in place of vinegar",
      "Add to deviled egg filling or potato salad",
      "Drink it (seriously — great electrolyte recovery after a workout)",
    ],
    howToStore: "Refrigerate in its original jar or another sealed container. Lasts 2–3 months. Keep utensils clean.",
    substitutes: ["Olive brine", "Vinegar + a pinch of salt and dill"],
    usedIn: ["Waste-Not Vinaigrette", "Anytime Hash"],
  },
  "Confit Oil": {
    name: "Confit Oil",
    role: "Flavor base",
    whatItIs: "The leftover oil from confit cooking — slow-cooked with vegetables, meat, herbs, or all three at low temperature. It absorbs everything it touched: garlic sweetness, spice warmth, vegetable depth. Liquid gold for your pantry.",
    whereToFind: "You make it. The oil from a confit project is the prize, not the byproduct.",
    howToUse: [
      "Drizzle over bread, pasta, or roasted vegetables",
      "Use as the fat base in vinaigrettes or pesto",
      "Splash into popcorn oil for an unforgettable batch",
      "Sauté aromatics in it to start any dish",
    ],
    howToStore: "Strain through fine mesh, refrigerate in an airtight jar. Lasts several weeks. Cooked confit oil is more stable than raw infusions.",
    substitutes: ["Good extra-virgin olive oil + a pinch of the spices used"],
    usedIn: ["Pantry Pasta", "Pantry Popcorn", "Waste-Not Vinaigrette", "Confit Project"],
  },
  "Rendered Fat": {
    name: "Rendered Fat (Schmaltz, Bacon Fat, etc.)",
    role: "Flavor base",
    whatItIs: "The pure fat that comes out of meat as it cooks. Chicken fat (schmaltz), bacon fat, beef tallow, duck fat — each has its own character. Rendered properly and strained, it's a condiment-grade ingredient that adds depth no oil can match.",
    whereToFind: "You collect it. After roasting a chicken or frying bacon, pour the rendered fat through a fine strainer into a jar.",
    howToUse: [
      "Fry eggs, potatoes, or vegetables in it instead of oil",
      "Add a spoonful to soup or stock for instant richness",
      "Use as the fat in a hash to start the meal",
      "Make compound butter (cold, mixed with herbs and salt)",
    ],
    howToStore: "Refrigerate in an airtight jar (3–6 months) or freeze (1+ year). Always strain before storing.",
    substitutes: ["Butter", "Olive oil + a splash of soy sauce for savory depth"],
    usedIn: ["Anytime Hash", "Pantry Pasta", "Alchemist's Soup"],
  },
  "Fried Shallots": {
    name: "Fried Shallots",
    role: "Texture + umami",
    whatItIs: "Thinly sliced shallots fried in oil until deep golden and crispy. They taste sweet, savory, and intensely concentrated. The oil they're fried in becomes a flavor-packed bonus ingredient.",
    whereToFind: "You make them — see The Curious Confit Template in the book. Asian groceries sell pre-made versions (look for Maesri or similar) that are perfectly fine.",
    howToUse: [
      "Sprinkle on hashes, soups, salads, rice bowls — anywhere you want crunch",
      "Blend into pesto for incredible depth",
      "Mix into vinaigrettes for a sweet-savory aromatic",
      "Top deviled eggs, avocado toast, scrambled eggs",
    ],
    howToStore: "Pantry in an airtight container, ~1 week. Freezer for several months. Their oil keeps refrigerated for several weeks.",
    substitutes: ["Crispy fried onions (less refined but same role)", "Toasted breadcrumbs (different texture, similar function)"],
    usedIn: ["Improvised Pesto", "Anytime Hash", "Pantry Pasta", "Waste-Not Vinaigrette"],
  },
  "Tahini": {
    name: "Tahini",
    role: "Creamy emulsifier",
    whatItIs: "Ground sesame seed paste — like peanut butter but made from sesame. It's nutty, slightly bitter, and rich. Common in Middle Eastern cooking, where it's whisked with lemon and garlic to make sauces.",
    whereToFind: "International aisle, near the peanut butter or with Middle Eastern foods. Soom, Seed + Mill, and Whole Foods house brands are all excellent.",
    howToUse: [
      "Whisk into vinaigrettes as a creamy emulsifier (1 tsp)",
      "Mix with lemon juice, garlic, and water for a quick drizzle sauce",
      "Stir into hummus or yogurt dips",
      "Add to pesto for a creamy, dairy-free version",
    ],
    howToStore: "Pantry, but stir well — the oil will separate and rise. Lasts 6+ months unopened, several months opened.",
    substitutes: ["Sunflower seed butter (similar texture)", "Almond butter (sweeter)", "Greek yogurt (different but similar role in sauces)"],
    usedIn: ["Waste-Not Vinaigrette"],
  },
  "Mustard": {
    name: "Mustard (Dijon, Whole Grain, Yellow)",
    role: "Emulsifier + tang",
    whatItIs: "Ground mustard seeds with vinegar or wine. Dijon (smooth, sharp, French) is the workhorse. Whole grain has texture and milder bite. Yellow (American) is mild and tangy. All three emulsify oil and acid into stable dressings.",
    whereToFind: "Condiment aisle. For Dijon, Maille and Edmond Fallot are reliably great.",
    howToUse: [
      "Whisk into every vinaigrette (1 tsp = the foundation)",
      "Brush onto chicken or pork before roasting",
      "Stir into pan sauces for richness and tang",
      "Mix into mayo or yogurt for dipping sauces",
    ],
    howToStore: "Refrigerate after opening. Lasts a year+; flavor mellows with age.",
    substitutes: ["Whole grain mustard for Dijon (chunky alternative)", "Mayonnaise (emulsifying but no tang)"],
    usedIn: ["Waste-Not Vinaigrette"],
  },
  "Tomato Paste": {
    name: "Tomato Paste",
    role: "Umami builder",
    whatItIs: "Tomatoes cooked down to an intensely concentrated, dark red paste. A tablespoon punches above its weight — sweet, savory, deeply red, slightly funky. Toasting it in oil 'blooms' it and unlocks even more flavor.",
    whereToFind: "Cans (small) or tubes in the canned tomato aisle. Tubes are great for small amounts — one squeeze, refrigerate, repeat.",
    howToUse: [
      "Toast in oil with aromatics until darkened — the foundation for many sauces",
      "Stir into braises and stews for color and depth",
      "Add to vinaigrettes for sweet-savory complexity",
      "Mix into compound butter or finishing sauces",
    ],
    howToStore: "Refrigerate opened cans (transfer to a jar) up to 1 week or freeze in tablespoon portions. Tubes last a month+ refrigerated.",
    substitutes: ["Sun-dried tomato paste", "Reduced tomato sauce (use more)", "Roasted red pepper paste (different flavor, similar function)"],
    usedIn: ["Pantry Pasta"],
  },
  "Soy Sauce": {
    name: "Soy Sauce / Tamari",
    role: "Umami builder",
    whatItIs: "Fermented soybean liquid that adds salt and deep savory depth. Tamari is the gluten-free version (or near-zero gluten). Light soy is saltier and thinner; dark soy is sweeter and thicker. Always go for naturally brewed.",
    whereToFind: "International aisle. Kikkoman is reliable; Japanese-style brands like San-J or specialty Chinese brands are even better.",
    howToUse: [
      "Splash into vinaigrettes for umami without anchovy",
      "Stir into braises and soups for instant savory depth",
      "Brush onto vegetables before roasting",
      "Mix with vinegar and aromatics for a quick dipping sauce",
    ],
    howToStore: "Pantry or refrigerator. Doesn't really go bad but mellows after 1–2 years opened.",
    substitutes: ["Tamari (gluten-free)", "Worcestershire (fish-based)", "Coconut aminos (soy-free, sweeter)"],
    usedIn: ["Improvised Pesto", "Waste-Not Vinaigrette"],
  },
  "Worcestershire": {
    name: "Worcestershire Sauce",
    role: "Umami builder",
    whatItIs: "A British sauce based on fermented anchovies, vinegar, tamarind, molasses, and spices. It's funky, tangy, sweet, and savory all at once. Lea & Perrins is the original and still the gold standard.",
    whereToFind: "Condiment aisle. Vegan versions exist (anchovy-free) for those who avoid fish.",
    howToUse: [
      "Splash into a Caesar dressing or vinaigrette",
      "Add to ground meat for burgers or meatloaf",
      "Stir into a Bloody Mary or Michelada",
      "Brush on steaks before grilling for extra depth",
    ],
    howToStore: "Pantry or refrigerator after opening. Lasts years.",
    substitutes: ["Soy sauce + a splash of balsamic", "Fish sauce (much fishier)"],
    usedIn: ["Improvised Pesto", "Waste-Not Vinaigrette"],
  },
  "Pine Nuts": {
    name: "Pine Nuts",
    role: "Crunch + richness",
    whatItIs: "The seeds of pine cones — small, ivory-colored, buttery, and slightly resinous. The traditional crunch in pesto. They're expensive because they're hand-harvested, so substitutes are perfectly acceptable.",
    whereToFind: "Bulk bins or small bags in the baking or international aisle. Mediterranean ones are pricier and more flavorful than Asian varieties.",
    howToUse: [
      "Toast lightly in a dry pan, then blend into pesto",
      "Sprinkle toasted on salads, pasta, or roasted vegetables",
      "Stir into rice pilafs or grain bowls",
      "Add to cookie or biscotti doughs",
    ],
    howToStore: "Refrigerate or freeze — they go rancid quickly at room temperature. Toasted ones especially.",
    substitutes: ["Walnuts (more bitter)", "Pistachios (sweet, vibrant green)", "Sunflower or pumpkin seeds (nut-free)"],
    usedIn: ["Improvised Pesto"],
  },
  "Sumac": {
    name: "Sumac",
    role: "Acid + color",
    whatItIs: "Dried, ground berries from a Middle Eastern bush. Tart, lemony, slightly fruity — a clean way to add citrus brightness without using fresh citrus. Deep red color is a beautiful finishing touch.",
    whereToFind: "Spice aisle in good supermarkets, or Middle Eastern grocers. Burlap & Barrel and Spicewalla sell vibrant fresh versions.",
    howToUse: [
      "Sprinkle on hummus, salads, yogurt, or grilled meats as a finishing spice",
      "Mix into spice rubs for chicken or fish",
      "Add to vinaigrettes for color and a citrusy edge",
      "Toss with onions before they go in a salad — quick pickle effect",
    ],
    howToStore: "Pantry, airtight, away from light. Best within a year.",
    substitutes: ["Lemon zest + a pinch of salt", "Tamarind paste (different but similar role)"],
    usedIn: [],
  },
  "Olive Oil": {
    name: "Olive Oil",
    role: "Fat + finishing",
    whatItIs: "Pressed from olives, ranging from mild and golden to peppery, grassy extra-virgin. It's both a cooking fat and a finishing flavor — a good extra-virgin drizzled raw over a finished dish is its own seasoning. Lower smoke point than neutral oils, so it's better for medium heat and finishing than for high-heat frying.",
    whereToFind: "Every grocery store. For finishing, buy a bottle you'd happily taste off a spoon; for cooking, a mid-range extra-virgin is plenty. Dark bottles protect it from light.",
    howToUse: [
      "Drizzle raw over soup, pasta, eggs, or grilled bread as a finishing flavor",
      "Build the base of a vinaigrette (3 parts oil to 1 part acid)",
      "Bloom garlic and aromatics gently at the start of a sauce",
      "Use as the fat for a confit when you want its flavor to come through",
    ],
    howToStore: "Cool, dark cupboard, tightly capped. Use within a few months of opening — it goes stale and bitter with light and air, not safer with the fridge.",
    substitutes: ["Neutral oil (for high heat)", "Avocado oil", "Rendered fat", "Butter"],
    usedIn: ["Improvised Pesto", "Pantry Pasta", "Waste-Not Vinaigrette"],
  },
  "Greek Yogurt": {
    name: "Greek Yogurt",
    role: "Creaminess + tang",
    whatItIs: "Yogurt strained to remove much of the whey, leaving it thick, rich, and tangy. It brings the creaminess of sour cream with a brighter, more acidic edge — useful anywhere you want body plus a little lift.",
    whereToFind: "Dairy aisle. Full-fat behaves best in cooking; non-fat can be chalky and is more likely to split when heated.",
    howToUse: [
      "Stir into a dip or sauce base with herbs, garlic, and lemon",
      "Dollop onto soups, stews, or roasted vegetables for cool contrast",
      "Use as a tangy stand-in for cream cheese or sour cream",
      "Whisk into a marinade — the acidity tenderizes chicken beautifully",
    ],
    howToStore: "Refrigerate. Don't boil it into a hot sauce — stir it in off the heat, or it can curdle.",
    substitutes: ["Sour cream (don't boil)", "Mayonnaise (emulsifying but no tang)", "Soft goat cheese", "Full-fat coconut milk (dairy-free)"],
    usedIn: ["Waste-Not Vinaigrette"],
  },
  "Vinegar": {
    name: "Vinegar",
    role: "Acid builder",
    whatItIs: "Soured liquid — wine, cider, rice, malt — that adds bright, clean acidity. Acid is one of the four flavor builders: a splash cuts through richness and makes a heavy dish feel lighter. Different vinegars carry different personalities, from sweet balsamic to sharp white.",
    whereToFind: "Every store. Keep one light and neutral (white wine or cider) and one with character (balsamic or sherry) and you can cover most needs.",
    howToUse: [
      "Add a splash at the end of a soup or braise that tastes flat or heavy",
      "Build a vinaigrette (3 parts oil to 1 part vinegar)",
      "Deglaze a pan to lift the browned bits into a sauce",
      "Quick-pickle thinly sliced onions or cucumbers in minutes",
    ],
    howToStore: "Pantry, indefinitely — vinegar is already a preservative. Cloudiness is harmless.",
    substitutes: ["Lemon or lime juice", "Pickle brine", "Olive brine", "Dry white wine"],
    usedIn: ["Waste-Not Vinaigrette", "Anytime Hash"],
  },
  "Butter": {
    name: "Butter",
    role: "Fat + richness",
    whatItIs: "Churned cream — fat, water, and milk solids. It carries flavor, adds richness, and browns into nutty depth when cooked past melting. A knob stirred in at the end gives a sauce gloss and body that oil alone can't.",
    whereToFind: "Dairy aisle. Unsalted gives you control over seasoning; cultured butter has a pleasant tang. Watch for burning over high direct heat — the milk solids scorch.",
    howToUse: [
      "Finish a pan sauce off the heat with a cold knob for shine and body",
      "Brown it (beurre noisette) for a nutty depth on vegetables, fish, or pasta",
      "Make a compound butter with herbs, garlic, or Old Bay for steaks",
      "Combine with a little oil to fry at higher heat without scorching",
    ],
    howToStore: "Refrigerate; freeze for months. Clarify it into ghee for a higher smoke point and longer life.",
    substitutes: ["Ghee", "Olive oil", "Rendered fat", "Coconut oil"],
    usedIn: ["Anytime Hash", "Pantry Popcorn"],
  },
  "Lemon": {
    name: "Lemon",
    role: "Acid builder",
    whatItIs: "The workhorse citrus — bright, clean, sour juice and fragrant zest. A squeeze at the end wakes up almost anything; the zest carries aromatic oils with no added liquid. One of the simplest ways to add the 'acid' flavor builder.",
    whereToFind: "Produce aisle year-round. Heavier fruit yields more juice; roll it firmly before juicing. Unwaxed or organic if you'll use the zest.",
    howToUse: [
      "Squeeze over finished fish, vegetables, soups, or beans to brighten",
      "Zest into dressings, pasta, or gremolata for aroma without liquid",
      "Freeze spent halves and zest for stocks and steaming",
      "Whisk juice into a vinaigrette as the acid",
    ],
    howToStore: "Counter for a week or refrigerated for longer. Freeze juice in cubes and zest in a bag for months.",
    substitutes: ["Lime juice", "White wine vinegar", "Apple cider vinegar", "Pickle brine"],
    usedIn: ["Waste-Not Vinaigrette", "Anytime Hash", "Improvised Pesto"],
  },
  "Lime": {
    name: "Lime",
    role: "Acid builder",
    whatItIs: "A small, sharp, aromatic citrus — more floral and slightly more bitter than lemon. Interchangeable with lemon in most savory roles, with its own distinct perfume that suits anything bright and fresh.",
    whereToFind: "Produce aisle. Choose firm, heavy fruit with smooth skin; warm them and roll before juicing for the most yield.",
    howToUse: [
      "Squeeze over tacos, grilled vegetables, or a mashed-avocado spread",
      "Zest into dressings and marinades for fragrance",
      "Balance rich or spicy dishes with a finishing squeeze",
      "Swap in anywhere a recipe wants lemon and you want a little more edge",
    ],
    howToStore: "Counter for a week, refrigerated longer. Juice freezes well in cubes.",
    substitutes: ["Lemon", "White wine vinegar", "Apple cider vinegar"],
    usedIn: ["Waste-Not Vinaigrette"],
  },
  "Coconut Milk": {
    name: "Coconut Milk",
    role: "Creaminess (dairy-free)",
    whatItIs: "Pressed from grated coconut flesh and water, full-fat canned coconut milk is rich and creamy with a gentle sweetness. It brings body to sauces and soups without dairy and won't curdle from acid the way cream can.",
    whereToFind: "Canned/international aisle. Full-fat in a can (not the thin carton 'coconut beverage') is what you want for cooking; the firm cream rises to the top.",
    howToUse: [
      "Stir into curries, soups, or braises for a silky, rich body",
      "Use in place of heavy cream in a blended soup (it won't split)",
      "Whip the chilled firm top into a dairy-free cream",
      "Simmer with aromatics and spices as a sauce base",
    ],
    howToStore: "Pantry until opened; then refrigerate and use within a few days. Freeze leftovers in cubes for future sauces.",
    substitutes: ["Heavy cream", "Greek yogurt (stir in off heat)", "Puréed potato or white beans (for body)"],
    usedIn: ["Pantry Pasta"],
  },
  "Ghee": {
    name: "Ghee (Clarified Butter)",
    role: "Fat (high heat)",
    whatItIs: "Butter simmered until the water cooks off and the milk solids brown and are strained away, leaving pure golden fat with a nutty aroma. Because the solids are gone, it has a high smoke point and keeps far longer than butter.",
    whereToFind: "Many grocery stores (international or oil aisle), Indian grocers, or make it from butter at home in 15 minutes.",
    howToUse: [
      "Sear and fry at higher heat where butter would burn",
      "Finish rice, lentils, or roasted vegetables with a spoonful",
      "Use as the fat for a confit or a high-heat hash",
      "Carry warm spices — bloom cumin or mustard seed in it",
    ],
    howToStore: "Airtight; keeps weeks at room temperature and months refrigerated. No milk solids means it resists going rancid.",
    substitutes: ["Butter", "Neutral oil", "Rendered fat"],
    usedIn: ["Anytime Hash"],
  },
  "Fish Sauce": {
    name: "Fish Sauce",
    role: "Umami builder",
    whatItIs: "Fermented fish and salt, aged into a pungent amber liquid. Like anchovies, it smells assertive in the bottle but melts into pure savory depth in a dish. A few drops add the kind of background richness that makes people ask what's in it.",
    whereToFind: "International aisle or Asian grocers. Red Boat is a clean, widely loved brand. A little goes a long way.",
    howToUse: [
      "Add a few drops to soups, braises, or dressings for deep umami",
      "Use in place of (or with) anchovy for savory depth",
      "Balance with lime and a touch of sugar for a quick dipping sauce",
      "Season a stir-fry or marinade instead of some of the salt",
    ],
    howToStore: "Pantry or fridge; keeps for a year or more. The flavor mellows slightly over time.",
    substitutes: ["Soy sauce", "Worcestershire", "Minced anchovy", "Tamari (gluten-free)"],
    usedIn: [],
  },
  "Olive Brine": {
    name: "Olive Brine",
    role: "Acid + salt",
    whatItIs: "The salty, tangy liquid left in an olive jar — a free seasoning most people pour down the drain. It carries acid, salt, and a savory olive note all at once, in the spirit of saving pickle brine.",
    whereToFind: "Already in your fridge, in the olive jar. Any olive works; the brine takes on their character.",
    howToUse: [
      "Splash into a vinaigrette for salty, briny depth",
      "Add to a pan sauce or braise instead of some of the salt and acid",
      "Stir into a Bloody Mary or a dirty martini",
      "Use as part of a quick brine for chicken",
    ],
    howToStore: "Refrigerate in the jar; keeps for months as long as utensils stay clean.",
    substitutes: ["Pickle brine", "Caper brine", "Vinegar + a pinch of salt"],
    usedIn: ["Waste-Not Vinaigrette"],
  },
  "Walnuts": {
    name: "Walnuts",
    role: "Texture + richness",
    whatItIs: "A rich, slightly bitter, buttery nut with a tender crunch. Toasting wakes up the oils and deepens the flavor. They bring body and crunch to pesto, salads, and pastas, and break down into a creamy richness when blended.",
    whereToFind: "Baking or bulk aisle. Buy whole or halves and chop yourself for freshness; they go rancid faster once broken.",
    howToUse: [
      "Toast and chop over pasta, salads, or roasted vegetables for crunch",
      "Blend into pesto in place of pine nuts (earthier, less sweet)",
      "Fold into a grain bowl or hash for texture",
      "Candy or spice them for a salad topping",
    ],
    howToStore: "Airtight in the pantry short-term; refrigerate or freeze for months, since their oils go rancid.",
    substitutes: ["Pine nuts", "Pistachios (sweet, vibrant green)", "Sunflower or pumpkin seeds (nut-free)", "Almond butter (sweeter)"],
    usedIn: ["Improvised Pesto", "Pantry Pasta"],
  },
  "Breadcrumbs": {
    name: "Breadcrumbs",
    role: "Texture + binder",
    whatItIs: "Dried, ground bread — a way to turn stale loaf ends into crunch or body. Toasted in oil with garlic they become pangrattato, the 'poor man's Parmesan' that finishes a pasta with crackle. They also bind meatballs and burgers.",
    whereToFind: "Make them from stale bread (blitz and toast) or buy plain or panko in the baking aisle. Panko stays especially crisp.",
    howToUse: [
      "Toast in olive oil with garlic and scatter over pasta or salads",
      "Bind ground meat for meatballs, burgers, or fritters",
      "Top a gratin or baked vegetables for a crisp crust",
      "Crisp and use to add crunch to a soup or braise",
    ],
    howToStore: "Airtight pantry container for plain dried crumbs; freeze fresh crumbs and toast straight from frozen.",
    substitutes: ["Crushed crackers, chips, or pretzels", "Rolled oats", "Cooked, mashed grains (quinoa, rice)", "Toasted breadcrumbs (different texture, similar function)"],
    usedIn: ["Pantry Pasta", "Anytime Hash"],
  },
  "Fresh Herbs": {
    name: "Fresh Herbs",
    role: "Aromatic brightness",
    whatItIs: "Leafy aromatics that add fresh, green lift. The single most useful thing to know is the split between HARDY herbs (woody stems — rosemary, thyme, sage, oregano, bay) and TENDER herbs (soft stems — parsley, cilantro, basil, dill, mint, chives). Hardy herbs stand up to long cooking and want to go in early; tender herbs lose their aroma with heat and want to go in at the very end or raw.",
    whereToFind: "Produce section. Buy bunches that look perky, not wilted. Many herbs swap within their flavor family: cilantro↔parsley, marjoram↔oregano, tarragon↔fennel fronds.",
    howToUse: [
      "Add hardy herbs (rosemary, thyme) early so they infuse the dish; pull woody stems before serving",
      "Stir tender herbs (parsley, basil, dill) in off the heat or scatter raw at the end",
      "Save tender stems — they carry as much flavor as the leaves; blend into pesto or chimichurri",
      "Swap within a family, and remember dried herbs are stronger: use about 1/3 the amount of fresh",
    ],
    howToStore: "Tender herbs: stems in a jar of water, loosely bagged, in the fridge — like cut flowers. Hardy herbs: wrapped in a barely damp towel in the fridge. Freeze any extra in oil in an ice-cube tray for cooking.",
    substitutes: ["Dried herbs (use 1/3 the amount)", "Cilantro ↔ parsley", "Marjoram ↔ oregano", "Tarragon ↔ fennel"],
    usedIn: ["Improvised Pesto", "Anytime Hash", "Waste-Not Vinaigrette"],
  },
  "Wine": {
    name: "Wine (for Cooking)",
    role: "Acid + depth",
    whatItIs: "Wine adds acidity, fruit, and complexity as it cooks down; the alcohol mostly simmers off, concentrating the flavor. The one rule worth internalizing: cook with wine you'd actually drink. Skip bottles labeled 'cooking wine' — they're loaded with salt and taste harsh. A dry, unoaked wine is the safe default.",
    whereToFind: "Any wine shelf. For savory cooking: a dry white like Sauvignon Blanc or Pinot Grigio (bright, clean) or a dry red like Côtes du Rhône or Chianti (for braises and tomato sauces). Vermouth is a great shelf-stable stand-in for white wine — it keeps for months.",
    howToUse: [
      "Deglaze a pan with a splash after searing — scrape up the browned bits into a sauce",
      "Add dry white to seafood, chicken, or cream sauces; dry red to beef braises and tomato sauces",
      "Reduce by half before adding other liquids so the raw alcohol edge cooks off",
      "A splash of acid like wine can replace some of the vinegar or lemon in a pan sauce",
    ],
    howToStore: "Refrigerate leftover wine and use within a few days, or freeze in cubes for cooking. Vermouth keeps for months in the fridge and is the low-waste choice if you cook with white only occasionally.",
    substitutes: ["Dry white wine", "Vinegar", "Stock + a splash of vinegar", "Lemon"],
    usedIn: ["Alchemist's Soup", "Pantry Pasta"],
  },
  "Neutral Oil": {
    name: "Neutral Oil",
    role: "Fat + cooking medium",
    whatItIs: "Flavorless, high-smoke-point oils whose job is to carry heat without adding taste — the opposite of olive oil. Smoke point is the thing to know: it's the temperature where oil starts to burn and turn acrid. Neutral oils (canola, vegetable, grapeseed, avocado, peanut) sit high, so they're what you reach for to sear, fry, and pop popcorn.",
    whereToFind: "Oil aisle. Canola and vegetable are cheapest; grapeseed and avocado are higher-smoke-point and a bit cleaner-tasting; peanut is classic for frying.",
    howToUse: [
      "Use for high-heat work: searing, stir-frying, deep-frying, popping popcorn",
      "Reach for it (not olive oil) when you don't want the fat to add its own flavor",
      "Make an infused oil — its blankness lets garlic, chili, or herbs come through cleanly",
      "Pair with butter so you can cook hotter without the butter scorching",
    ],
    howToStore: "Cool, dark cupboard, capped. It goes rancid slowly; if it smells like crayons or old nuts, replace it.",
    substitutes: ["Avocado oil", "Grapeseed oil", "Peanut oil", "Light olive oil (low heat)"],
    usedIn: ["Confit Project", "Pantry Popcorn", "Anytime Hash"],
  },
  "Heavy Cream": {
    name: "Heavy Cream",
    role: "Body & creaminess",
    whatItIs: "High-fat dairy (about 36% fat) that adds richness and silk to sauces and soups. Its high fat is exactly why it behaves well with heat — it can simmer and reduce without curdling, unlike yogurt, sour cream, or milk. Reducing it thickens and enriches; whipping it incorporates air.",
    whereToFind: "Dairy aisle. Look for 'heavy cream' or 'heavy whipping cream' (same thing). Lighter creams and milk have less fat and are more likely to break when boiled.",
    howToUse: [
      "Stir into a pan sauce and simmer to thicken — it won't split the way yogurt would",
      "Finish a soup off the heat for body and a velvety mouthfeel",
      "Reduce with garlic and Parmesan for a quick cream sauce",
      "Whip cold cream for a topping; it doubles in volume",
    ],
    howToStore: "Refrigerate; it lasts longer than milk thanks to the fat. Freezes acceptably for cooking (not for whipping) — it may look grainy thawed but smooths out when heated.",
    substitutes: ["Full-fat coconut milk", "Puréed potato or white beans", "Greek yogurt (stir in off heat)", "Sour cream (don't boil)"],
    usedIn: ["Pantry Pasta", "Alchemist's Soup"],
  },
  "Sour Cream": {
    name: "Sour Cream",
    role: "Creaminess + tang",
    whatItIs: "Cultured cream — tangy, rich, and lower in fat than heavy cream, which is why it curdles if you boil it. It's a cooling, acidic finish more than a cooking liquid. Closely related to crème fraîche, which has more fat and can take more heat.",
    whereToFind: "Dairy aisle, near the yogurt. Full-fat behaves best; crème fraîche is the more heat-stable upgrade if you can find it.",
    howToUse: [
      "Dollop onto soups, chili, tacos, or baked potatoes for cool, tangy contrast",
      "Stir into a sauce off the heat — never boil it, or it breaks",
      "Fold into dips and dressings for body and tang",
      "Use in baking for tender, moist crumb",
    ],
    howToStore: "Refrigerate. If liquid pools on top, stir it back in. Doesn't freeze well — it separates.",
    substitutes: ["Greek yogurt (different but similar role in sauces)", "Crème fraîche", "Mayonnaise (emulsifying but no tang)"],
    usedIn: ["Anytime Hash"],
  },
  "Goat Cheese": {
    name: "Goat Cheese (Chèvre)",
    role: "Creaminess + tang",
    whatItIs: "Soft, spreadable cheese with a bright, tangy, slightly grassy flavor. Lower in fat than cream cheese and more acidic, it melts into a sauce smoothly and adds tang without needing extra acid. A little goes a long way.",
    whereToFind: "Cheese section, usually in logs. Plain is most versatile; herbed versions are handy for a quick spread.",
    howToUse: [
      "Crumble over salads, roasted vegetables, or grain bowls",
      "Stir into warm pasta or risotto for an instant creamy, tangy sauce",
      "Spread on toast under roasted tomatoes or a drizzle of honey",
      "Whip with a little oil or yogurt for a dip",
    ],
    howToStore: "Refrigerate tightly wrapped; it picks up fridge odors. Use within a week or two of opening. Freezes acceptably for cooking, not for a cheese board.",
    substitutes: ["Cream cheese (milder)", "Greek yogurt (don't boil)", "Feta (saltier, firmer)"],
    usedIn: [],
  },
  "Pistachios": {
    name: "Pistachios",
    role: "Crunch + richness",
    whatItIs: "Sweet, vivid-green nuts with a delicate flavor and tender crunch — milder and prettier than walnuts. They bring color and a gentle richness to pesto, grain dishes, and toppings, and they're soft enough to chop or blend easily.",
    whereToFind: "Snack or baking aisle. Buy shelled to save effort; unsalted if you'll cook with them. Bright green ones are freshest.",
    howToUse: [
      "Chop and scatter over salads, roasted vegetables, or yogurt for crunch and color",
      "Blend into a pesto for a sweeter, greener result than pine nuts or walnuts",
      "Fold into rice or grain dishes for texture",
      "Crust fish or chicken with chopped pistachios",
    ],
    howToStore: "Airtight; refrigerate or freeze for longer life, since their oils go rancid like all nuts.",
    substitutes: ["Pine nuts", "Walnuts (more bitter)", "Sunflower or pumpkin seeds (nut-free)"],
    usedIn: ["Improvised Pesto"],
  },
  "Coconut Oil": {
    name: "Coconut Oil",
    role: "Fat (with flavor)",
    whatItIs: "Oil pressed from coconut, solid at room temperature and liquid when warm. Refined coconut oil is nearly neutral with a higher smoke point; unrefined (virgin) carries a distinct coconut aroma. The thing to know: it's saturated, so it stays solid and gives baked goods and confections a satisfying snap.",
    whereToFind: "Oil aisle or baking section. Pick refined for high-heat or neutral cooking, virgin when you want the coconut flavor.",
    howToUse: [
      "Sauté or roast where a touch of coconut suits the dish (curries, tropical flavors)",
      "Use refined for higher-heat cooking; virgin where you want the aroma",
      "Swap for butter in vegan baking, spoon for spoon",
      "Make a quick chocolate shell — it hardens when it hits something cold",
    ],
    howToStore: "Pantry, capped; it keeps a long time. It'll be solid or liquid depending on room temperature — both are fine.",
    substitutes: ["Butter", "Ghee", "Neutral oil", "Olive oil"],
    usedIn: [],
  },
  "Avocado Oil": {
    name: "Avocado Oil",
    role: "Fat (high heat)",
    whatItIs: "Pressed from avocado flesh, mild and buttery with one of the highest smoke points of any oil — which makes it a premium neutral oil for searing and high-heat roasting. Refined is best for cooking; unrefined is greener and better raw.",
    whereToFind: "Oil aisle, pricier than canola. Worth it when you want a clean, high-heat oil that doesn't add much flavor.",
    howToUse: [
      "Sear, stir-fry, or roast at high heat where you want no off-flavors",
      "Use raw in dressings for a mild, buttery base",
      "Substitute anywhere a recipe wants a neutral oil with a high smoke point",
      "Drizzle unrefined over finished dishes for a grassy note",
    ],
    howToStore: "Cool, dark cupboard, capped. Keeps well; replace if it smells off.",
    substitutes: ["Neutral oil", "Grapeseed oil", "Peanut oil", "Light olive oil (low heat)"],
    usedIn: ["Anytime Hash"],
  },
  "Cream Cheese": {
    name: "Cream Cheese",
    role: "Creaminess + tang",
    whatItIs: "Soft, mild, spreadable fresh cheese — rich and slightly tangy, milder than goat cheese or sour cream. It melts into a smooth, luscious sauce and is the binder behind the cured-salmon sandwich in the book's case study.",
    whereToFind: "Dairy aisle, in blocks (firmer, for cooking and baking) or tubs (softer, for spreading). Full-fat behaves best in sauces.",
    howToUse: [
      "Mix with capers and their brine for a savory sandwich spread",
      "Stir into warm pasta or mashed potatoes for instant creaminess",
      "Whisk into a sauce off the heat for body and gentle tang",
      "Bake into both savory dips and sweet desserts",
    ],
    howToStore: "Refrigerate tightly covered; use within a week or two of opening. Doesn't freeze well on its own — it gets grainy.",
    substitutes: ["Soft goat cheese", "Greek yogurt (don't boil)", "Sour cream (don't boil)", "Mascarpone (richer)"],
    usedIn: [],
  },
  "Crème Fraîche": {
    name: "Crème Fraîche",
    role: "Creaminess + tang",
    whatItIs: "Cultured cream, like a richer, less-sour cousin of sour cream. Its higher fat content is the key fact: unlike sour cream or yogurt, it can simmer in a hot sauce without curdling, which makes it the cook's tangy cream of choice.",
    whereToFind: "Better dairy sections or cheese counters. If you can't find it, you can approximate by stirring a little buttermilk into heavy cream and letting it sit.",
    howToUse: [
      "Stir into a hot pan sauce for tang and body — it won't break the way sour cream does",
      "Dollop onto soups, roasted vegetables, or fruit",
      "Fold into mashed potatoes or scrambled eggs for richness",
      "Whisk into a dressing for creamy tang",
    ],
    howToStore: "Refrigerate; keeps a couple of weeks. It thickens as it ages, which is fine.",
    substitutes: ["Sour cream (don't boil)", "Greek yogurt (don't boil)", "Heavy cream (less tang)"],
    usedIn: [],
  },
  "Feta": {
    name: "Feta",
    role: "Salt + tang",
    whatItIs: "A brined white cheese (traditionally sheep's or goat's milk) that's salty, tangy, and crumbly. Because it's stored in brine, it holds up in a marinade where most fresh cheeses would fall apart, and it brings both seasoning and acidity at once.",
    whereToFind: "Cheese section, in blocks in brine or pre-crumbled. Buy the block in brine — it's creamier and lasts longer than the dry pre-crumbled tubs.",
    howToUse: [
      "Crumble over salads, grain bowls, or roasted vegetables for salty tang",
      "Bake whole until soft and spreadable (with tomatoes, olive oil, herbs)",
      "Whip with a little oil and lemon into a dip",
      "Stir into a warm dish at the end so it softens but keeps its shape",
    ],
    howToStore: "Refrigerate in its brine; it keeps for weeks. If you bought it dry, a light saltwater brine extends its life.",
    substitutes: ["Soft goat cheese", "Cotija (drier, saltier)", "Ricotta salata"],
    usedIn: [],
  },
  "Mayonnaise": {
    name: "Mayonnaise",
    role: "Creaminess + binder",
    whatItIs: "An emulsion of oil, egg yolk, and acid — rich and creamy with no dairy tang. The useful trick most people miss: because it's already a stable fat emulsion, it makes a fantastic binder and browning agent (think crispier grilled cheese, juicier burgers) beyond just a spread.",
    whereToFind: "Condiment aisle. Plain works for almost everything; Japanese Kewpie is richer and more savory if you want to upgrade.",
    howToUse: [
      "Spread thin on the outside of a grilled cheese for an even, crispy crust",
      "Bind tuna, egg, or chicken salad",
      "Whisk with garlic, lemon, or mustard into a quick aioli-style sauce",
      "Use as the emulsifying base of a creamy dressing (no tang of its own)",
    ],
    howToStore: "Refrigerate after opening; use within a couple of months. Don't leave it warm — the egg makes it perishable.",
    substitutes: ["Greek yogurt (tangier)", "Sour cream (don't boil)", "Mashed avocado + a pinch of salt"],
    usedIn: [],
  },
  "Smoked Paprika": {
    name: "Smoked Paprika (Pimentón)",
    role: "Spice + smoke",
    whatItIs: "Peppers smoked over oak then ground, giving a deep red color and a smoky, savory warmth — the easiest way to add a campfire note without a grill. Comes sweet (dulce), bittersweet (agridulce), or hot (picante). It's the smoky backbone of many spice approximations.",
    whereToFind: "Spice aisle; Spanish brands in tins are excellent. Don't confuse it with regular (sweet, unsmoked) paprika — the smoke is the whole point.",
    howToUse: [
      "Stir into stews, beans, or braises for smoky depth",
      "Mix into a spice rub for chicken, pork, or roasted vegetables",
      "Bloom in oil at the start of a dish so the smoke comes through",
      "Add a pinch to approximate Old Bay or a chili blend",
    ],
    howToStore: "Cool, dark pantry, airtight. Best within a year — the smoke aroma fades with time.",
    substitutes: ["Sweet paprika + a drop of liquid smoke", "Chipotle powder (hotter)", "Aleppo pepper (different, brighter)"],
    usedIn: [],
  },
  "Aleppo Pepper": {
    name: "Aleppo Pepper",
    role: "Spice (mild heat)",
    whatItIs: "A coarsely ground Syrian/Turkish chili with moderate heat and a fruity, slightly raisiny, sun-dried-tomato character. Gentler and more aromatic than crushed red pepper flakes — it adds warmth and depth rather than sharp burn. A close cousin to Urfa pepper.",
    whereToFind: "Spice shops, Middle Eastern grocers, or online. Sometimes labeled Halaby pepper.",
    howToUse: [
      "Sprinkle over eggs, hummus, yogurt, or roasted vegetables as a finishing spice",
      "Stir into dressings and marinades for gentle, fruity heat",
      "Use in place of red pepper flakes when you want warmth without harsh bite",
      "Mix into compound butter or finishing oil",
    ],
    howToStore: "Cool, dark, airtight. Best within a year for full aroma.",
    substitutes: ["Urfa Pepper", "Smoked paprika + a pinch of cayenne", "Red pepper flakes (sharper)"],
    usedIn: [],
  },
  "Homemade Salts": {
    name: "Homemade Flavored Salts",
    role: "Salt builder + finish",
    whatItIs: "Plain salt is just the start. Mixing salt with dried zest, herbs, or even rendered fat makes a 'super salt' that seasons and adds a pop of flavor at once — a way to rescue scraps (spent citrus peels, herb stems, celery leaves) into something you'll reach for daily. The one rule: moisture is the enemy. Dried-ingredient salts keep for a year; fresh-ingredient salts must stay cold and get used within a week or two.",
    whereToFind: "You make these. Start with a coarse or flaky salt as the base. Dry your flavoring fully (oven on low, or air-dry) before grinding it in with the salt for a shelf-stable version.",
    howToUse: [
      "Citrus salt: dry spent lemon/lime zest, blitz with flaky salt — finish fish, rims, vegetables",
      "Herb or celery-leaf salt: dry the greens, grind in — a savory all-purpose finish",
      "Bacon-fat salt: mix rendered fat into salt for a smoky seasoning",
      "Use as a finishing salt at the table, or fold into cooking like any salt",
    ],
    howToStore: "Dried-ingredient salts: airtight jar in the pantry, 1+ year (clumping is just humidity, still fine). Fresh-ingredient salts: refrigerate and use within 1–2 weeks, since the moisture can grow mold.",
    substitutes: ["Coarse sea salt + a pinch of the dried flavoring", "Flaky finishing salt", "Sumac (for a tart, citrusy finish)"],
    usedIn: [],
  },
};

// Alias keys: alternate names that should resolve to an existing dive. Pointing to
// the same object (not a copy) keeps them in sync. These light up phrases like
// "Tamari (gluten-free)" and "Pecorino Romano" that name a known ingredient under a
// different word than the dive's primary key.
INGREDIENT_DEEP_DIVES["Tamari"] = INGREDIENT_DEEP_DIVES["Soy Sauce"];
INGREDIENT_DEEP_DIVES["Coconut aminos"] = INGREDIENT_DEEP_DIVES["Soy Sauce"];
INGREDIENT_DEEP_DIVES["Pecorino"] = INGREDIENT_DEEP_DIVES["Parmesan"];
INGREDIENT_DEEP_DIVES["Grana Padano"] = INGREDIENT_DEEP_DIVES["Parmesan"];

// Helper: find a deep-dive entry by checking if any key matches the ingredient name.
// Matching is substring-based so phrases like "light olive oil" still hit "Olive Oil".
// A few keys need guards against false matches where the key word appears inside a
// different ingredient (e.g. "almond butter" is NOT dairy "Butter").
const DEEP_DIVE_MATCH_EXCLUSIONS = {
  "Butter": [/\bnut butter\b/, /almond butter/, /peanut butter/, /seed butter/, /sunflower.*butter/, /cashew butter/, /apple butter/, /body butter/],
  "Lime": [/\blimestone\b/],
};
function findDeepDive(ingredientName) {
  if (!ingredientName) return null;
  const lower = ingredientName.toLowerCase();
  for (const key of Object.keys(INGREDIENT_DEEP_DIVES)) {
    if (lower.includes(key.toLowerCase())) {
      const excl = DEEP_DIVE_MATCH_EXCLUSIONS[key];
      if (excl && excl.some(re => re.test(lower))) continue; // false match — keep looking
      return INGREDIENT_DEEP_DIVES[key];
    }
  }
  return null;
}

// ============ TAB ORDER MODEL ============
// Tabs are grouped. Home is pinned first and Support pinned last (the anchors);
// the three middle groups — and the tabs within each — can be reordered by the
// user from Settings. Grouping is enforced so coupled tabs (Pantry feeds Builder)
// never get separated, and so "open the Storage tab" stays meaningful.
// All logic here is PURE (no React, no imports) so the QA harness can test it.
const TAB_GROUPS = [
  { id: "home",      label: "Home",       pinned: "first", tabs: ["home"] },
  { id: "core",      label: "Cooking",    tabs: ["builder", "pantry"] },
  { id: "yourstuff", label: "Recipes & notes", tabs: ["templates", "scrapbook"] },
  { id: "reference", label: "Reference",  tabs: ["subs", "storage"] },
  { id: "meta",      label: "Support",    pinned: "last", tabs: ["support"] },
];

// Human labels for each tab id (used by Settings reorder UI and the nav).
const TAB_LABELS = {
  home: "Home",
  builder: "Meal Builder",
  pantry: "My Pantry",
  templates: "Templates",
  scrapbook: "My Scrapbook",
  subs: "Substitutions",
  storage: "Storage & Safety",
  support: "Support",
};

// Icon for each tab id (shared by the nav and the Settings panel so they match).
const TAB_ICONS = {
  home: HomeIcon,
  builder: ChefHat,
  pantry: Archive,
  templates: BookOpen,
  scrapbook: BookMarked,
  subs: Sparkles,
  storage: Clock,
  support: Heart,
};

// One-line gloss per tab, for the Home guide's tab list. Kept beside TAB_LABELS /
// TAB_ICONS so all three stay in sync; the guide renders these in the user's own
// tab order (flattenTabOrder), not a hard-coded canonical order.
const TAB_NOTES = {
  builder:   "what can I make right now?",
  pantry:    "track what you've saved and when to use it",
  templates: "scaffolds, not recipes — build a thousand meals",
  scrapbook: "your saved discoveries and notes",
  subs:      "swap for the role, not the name",
  storage:   "how long things keep",
  support:   "share or support the book",
};

// A clean deep copy of the default order (group list, each with its tab list).
function defaultTabOrder() {
  return TAB_GROUPS.map(g => ({ id: g.id, tabs: g.tabs.slice() }));
}

// The indices a movable group is allowed to occupy: between the first-pinned
// block and the last-pinned block. Returns [lo, hi] inclusive movable range.
function movableRange(order) {
  let lo = 0, hi = order.length - 1;
  const meta = id => (TAB_GROUPS.find(g => g.id === id) || {}).pinned;
  while (lo < order.length && meta(order[lo].id) === "first") lo++;
  while (hi >= 0 && meta(order[hi].id) === "last") hi--;
  return [lo, hi];
}

// Move a (non-pinned) group up (-1) or down (+1). No-op at the movable bounds or
// if the group is pinned. Returns a NEW order array (never mutates input).
function moveGroup(order, groupId, dir) {
  const next = order.map(g => ({ id: g.id, tabs: g.tabs.slice() }));
  const meta = id => (TAB_GROUPS.find(g => g.id === id) || {}).pinned;
  if (meta(groupId)) return next; // pinned groups don't move
  const idx = next.findIndex(g => g.id === groupId);
  if (idx === -1) return next;
  const target = idx + dir;
  const [lo, hi] = movableRange(next);
  if (target < lo || target > hi) return next; // would cross a pinned anchor
  const [g] = next.splice(idx, 1);
  next.splice(target, 0, g);
  return next;
}

// Move a tab within its own group up (-1) or down (+1). No-op at group bounds.
// Tabs never leave their group. Returns a NEW order array.
function moveTabInGroup(order, groupId, tabId, dir) {
  const next = order.map(g => ({ id: g.id, tabs: g.tabs.slice() }));
  const grp = next.find(g => g.id === groupId);
  if (!grp) return next;
  const idx = grp.tabs.indexOf(tabId);
  if (idx === -1) return next;
  const target = idx + dir;
  if (target < 0 || target >= grp.tabs.length) return next;
  const [t] = grp.tabs.splice(idx, 1);
  grp.tabs.splice(target, 0, t);
  return next;
}

// Flatten the grouped order into the flat list of tab ids the nav renders.
function flattenTabOrder(order) {
  const out = [];
  (order || []).forEach(g => (g.tabs || []).forEach(t => out.push(t)));
  return out;
}

// Validate an order: every tab present exactly once, group membership unchanged
// (no tab migrated between groups), Home group first, Support group last. Used to
// reject corrupt/stale persisted orders and fall back to the default.
function isValidTabOrder(order) {
  if (!Array.isArray(order) || order.length !== TAB_GROUPS.length) return false;
  if (order[0]?.id !== "home") return false;
  if (order[order.length - 1]?.id !== "meta") return false;
  const byId = {};
  TAB_GROUPS.forEach(g => { byId[g.id] = g.tabs.slice().sort().join(","); });
  const seenGroups = new Set();
  for (const g of order) {
    if (!g || !byId[g.id]) return false;          // unknown group
    if (seenGroups.has(g.id)) return false;        // duplicate group
    seenGroups.add(g.id);
    if (!Array.isArray(g.tabs)) return false;
    if (g.tabs.slice().sort().join(",") !== byId[g.id]) return false; // membership changed
  }
  // All known groups accounted for
  return seenGroups.size === TAB_GROUPS.length;
}

// 7-day welcome series — one short reflection per day for the first week.
// Each surfaces a different core idea from the book.
const WELCOME_SERIES = [
  {
    day: 1,
    title: "Welcome to your scrapbook.",
    body: "This isn't a recipe app. It's a working kitchen — a place to think with what you have. The book argues that resourcefulness is the real skill, and that good cooking is mostly an act of paying attention. Take a look around. Tap on an ingredient. See what surfaces.",
    cta: { label: "Try the meal builder", tab: "builder" },
  },
  {
    day: 2,
    title: "The four flavor builders.",
    body: "Salt, oil, acid, umami. Every dish you love leans on at least one. When something tastes flat, ask: which one is missing? When something tastes muddy, ask: which one is too loud? This is the lens the rest of the book uses.",
    cta: { label: "See the substitutions", tab: "subs" },
  },
  {
    day: 3,
    title: "Save your first scrap.",
    body: "Tomorrow's improvisation starts with what you save today. A jar of pickle brine. The fat from last night's bacon. A frozen bag of vegetable scraps. Begin small — one item is enough. The pantry tab is where these live.",
    cta: { label: "Open the pantry", tab: "pantry" },
  },
  {
    day: 4,
    title: "Substitute for the role, not the name.",
    body: "If a recipe calls for lemon and you don't have one, don't ask 'what's another lemon?' Ask 'what does the lemon do here?' If it's brightness, vinegar will do. If it's perfume, lime works. Cook from the role and you'll never be stuck.",
    cta: { label: "Browse substitutions", tab: "subs" },
  },
  {
    day: 5,
    title: "Templates over recipes.",
    body: "A recipe gives you one meal. A template gives you a thousand. The seven templates in this book — pesto, hash, vinaigrette, popcorn, pasta, soup, confit — are scaffolds you can build on for the rest of your life. Pick one and walk through it.",
    cta: { label: "Open the templates", tab: "templates" },
  },
  {
    day: 6,
    title: "When in doubt, throw it out.",
    body: "Knowledge tells you what should be safe. Your senses tell you what is. Both matter. Cooking with confidence isn't about ignoring caution — it's about pairing the rules with your nose, your eyes, your tongue. Trust both, and they'll keep you out of trouble.",
    cta: { label: "Storage & safety", tab: "storage" },
  },
  {
    day: 7,
    title: "The end of the book is the beginning of yours.",
    body: "You've made it to the end of the welcome series. Now the real work starts: cooking, saving, noting what worked. The scrapbook tab is yours to fill. Build a recipe, save a discovery, write a note to your future self. That's the whole practice.",
    cta: { label: "Visit your scrapbook", tab: "scrapbook" },
  },
];

// 12 monthly templates — one new piece of content per month for a full year.
// Each surfaces an idea, story, or technique drawn from the book's voice.
// Auto-unlocks on the 1st of each month.
const MONTHLY_TEMPLATES = [
  { month: 1,  title: "January: The Resourceful New Year",         body: "New year resolutions usually mean restriction. The alchemist's version is the opposite: use what you already have. Take inventory of your fridge, freezer, and pantry. What's been languishing? What's about to expire? Build one meal this week using only those ingredients. Resolutions you can taste are the ones that stick." },
  { month: 2,  title: "February: Confit Season",                    body: "Cold months are confit months. Slow-cooking root vegetables or chicken thighs in fat at low heat fills your house with warmth and stocks your pantry with golden, infused oils that pay dividends for weeks. This month, pick one confit project. The vegetables become dinner; the oil joins your alchemist's pantry." },
  { month: 3,  title: "March: The Soup-from-Scraps Challenge",      body: "By March, your freezer scrap bag should be heavy. Time to make stock. Combine all those vegetable ends, herb stems, and Parmesan rinds with water in a slow cooker. Simmer 6 hours. Strain. You've just made gold from what most people throw away. Use it for soup, risotto, or as the base of a braise." },
  { month: 4,  title: "April: Spring Pickles",                      body: "Quick pickles take 24 hours and transform any vegetable into a bright, tangy condiment. Try radishes, carrot ribbons, or fennel. The brine you save afterward becomes a marinade, vinaigrette base, or even a savory drink mixer. One project, three rewards." },
  { month: 5,  title: "May: The Compound Butter Project",           body: "Soften a stick of butter. Mash in finely chopped herbs, citrus zest, garlic, miso, anchovy — anything bold. Roll in parchment, refrigerate. You've just made a flavor bomb you can melt onto steaks, eggs, vegetables, or toast for the next month. Different combinations every week." },
  { month: 6,  title: "June: Berry Vinegars and Shrubs",            body: "Macerate strawberries or raspberries in cider vinegar with a little sugar. After a week, you have a jewel-toned, fruity vinegar that brightens vinaigrettes, glazes for meat, or mixed with sparkling water becomes a shrub — a tart, refreshing summer drink." },
  { month: 7,  title: "July: Grilling Beyond the Grill",            body: "Don't waste the heat. While your grill is going, throw on lemon halves, whole tomatoes, scallions, peppers, even leftover bread. Char everything. Now you have a week's worth of smoky aromatics to fold into eggs, pastas, vinaigrettes, and rice bowls." },
  { month: 8,  title: "August: The Tomato Project",                  body: "Peak tomato season is short. Roast slow on a sheet pan with olive oil, salt, garlic, and herbs at 250°F for 3 hours. Pack in jars, cover with the cooking oil, refrigerate. You've just made tomato confit. Spread on toast. Toss with pasta. Spoon onto eggs. Liquid summer." },
  { month: 9,  title: "September: Stocking the Pantry for Fall",   body: "September is the month to refill. Render fat from any fall roasts and label it. Toast nuts and seeds in big batches and freeze. Make a fresh batch of fried shallots for the cool nights ahead. Walk into October with your pantry full and your future meals already half-made." },
  { month: 10, title: "October: Apple-Spice Confit",                body: "From the book: apples, parsnips, and carrots cooked low and slow in oil with cinnamon, allspice, and clove. The vegetables are dinner; the oil is a revelation — try it in popcorn or vinaigrettes. Autumn in liquid form." },
  { month: 11, title: "November: The Stuffing Principle",           body: "Thanksgiving teaches a year-round lesson: bread, fat, herbs, and broth can absorb anything. Apply it any month. Day-old bread torn into pieces, sautéed in butter, tossed with sage and stock — a side dish, a soup garnish, the base of a panzanella. The principle outlives the holiday." },
  { month: 12, title: "December: The Year-End Pantry Audit",        body: "Pull everything out. What did you save? What did you actually use? What languished? Be honest. The pantry isn't sacred — it's a working tool. Toss what you didn't reach for. Note what you missed. Walk into the new year with a leaner, smarter pantry. Then start over, wiser." },
];



function matchTemplates(selectedItems) {
  const lower = selectedItems.map(s => s.toLowerCase());
  const has = (term) => lower.some(item => item.includes(term));

  // First pass: score every template, regardless of whether anchor is met.
  const scored = TEMPLATES.map(t => {
    let needsMet = false;

    // A template with no anchor requirement (a pure framework) is always buildable.
    if (t.needs.length === 0) needsMet = true;

    // Check needs (the ideal starting points)
    if (t.needs.includes("pasta") && has("pasta")) needsMet = true;
    if (t.needs.includes("potato") && (has("potato") || has("sweet potato"))) needsMet = true;
    if (t.needs.includes("herb_or_green") && (has("basil") || has("parsley") || has("cilantro") || has("kale") || has("spinach"))) needsMet = true;
    if (t.needs.includes("sturdy_ingredient") && (has("carrot") || has("garlic") || has("shallot") || has("onion") || has("potato"))) needsMet = true;
    if (t.needs.includes("acid") && (has("vinegar") || has("lemon") || has("pickle"))) needsMet = true;
    if (t.needs.includes("broth_base") && (has("carrot") || has("onion") || has("potato") || has("garlic"))) needsMet = true;
    if (t.needs.includes("vegetable_scraps") && (has("carrot") || has("onion") || has("celery") || has("garlic") || has("mushroom") || has("scrap"))) needsMet = true;
    // popcorn_kernels needs a specific kernel selection — keep its anchor strict

    // Score: matched boosts + bonus if anchor is met
    const boostMatches = t.boosts.filter(b => has(b)).length;
    const score = boostMatches + (needsMet ? 2 : 0);

    // Build a friendly "what's missing" hint for templates without their starting ingredient
    let hint = null;
    if (!needsMet) {
      if (t.needs.includes("pasta")) hint = "Starts with pasta — add some to build this";
      else if (t.needs.includes("potato")) hint = "Starts with potatoes or another starch — add some to build this";
      else if (t.needs.includes("herb_or_green")) hint = "Starts with a fresh herb or green — add one to build this";
      else if (t.needs.includes("sturdy_ingredient")) hint = "Starts with a sturdy aromatic (carrot, garlic, shallot, onion) — add one to build this";
      else if (t.needs.includes("acid")) hint = "Starts with an acid (vinegar, lemon, pickle brine) — add one to build this";
      else if (t.needs.includes("broth_base")) hint = "Starts with stock-friendly aromatics — add some to build this";
      else if (t.needs.includes("vegetable_scraps")) hint = "Starts with saved vegetable scraps or aromatics — add some to build this";
      else if (t.needs.includes("popcorn_kernels")) hint = "Popcorn kernels needed";
    }

    return { ...t, score, needsMet, boostMatches, hint };
  });

  // Sort by: anchored matches first (by score), then unanchored suggestions (by boost matches)
  scored.sort((a, b) => {
    if (a.needsMet !== b.needsMet) return a.needsMet ? -1 : 1;
    return b.score - a.score;
  });

  // Always return at least the top 3 — even if none have anchors met, we want to give the user a path forward.
  // But cap at 6 results so the list isn't overwhelming.
  const anchored = scored.filter(t => t.needsMet);
  const suggestions = scored.filter(t => !t.needsMet && t.boostMatches > 0);
  const fallback = scored.filter(t => !t.needsMet && t.boostMatches === 0);

  // If we have anchored matches, return those (up to 6).
  // If no anchored matches but some boosts hit, surface those as "ideas" with hints.
  // If nothing matches at all, surface the closest 3 as gentle suggestions.
  let results;
  if (anchored.length > 0) {
    results = anchored.slice(0, 6);
    // Also tack on top 2 unanchored suggestions if they boost-matched what's on hand
    if (suggestions.length > 0 && results.length < 5) {
      results = [...results, ...suggestions.slice(0, 2)];
    }
  } else if (suggestions.length > 0) {
    results = suggestions.slice(0, 4);
  } else {
    // Nothing at all matches — show the 3 most universally useful templates as starting points
    const universals = ["Anytime Hash", "Alchemist's Soup", "Pantry Pasta"];
    results = universals
      .map(name => scored.find(t => t.name === name))
      .filter(Boolean);
  }

  return results;
}

// Map scrap types to ingredient tags the matcher recognizes
const SCRAP_TAGS = {
  "Rendered Fat (bacon, chicken)": ["butter", "bacon", "chicken"],
  "Cooked Infused Oil (confit oil)": ["olive oil", "garlic"],
  "Raw Infused Oil (garlic, fresh herbs)": ["olive oil", "garlic"],
  "Infused Vinegar": ["vinegar"],
  "Pickle Brine": ["vinegar", "pickle brine"],
  "Frozen Citrus (zest, juice, halves)": ["lemon"],
  "Parmesan Rinds": ["parmesan"],
  "Open Anchovies": ["anchovy"],
  "Confit Garlic": ["garlic"],
  "Dried-Ingredient Salt": [],
  "Fresh-Ingredient Salt": [],
  "Meat Confit": ["chicken"],
  "Vegetable/Fruit Confit": ["carrot"],
  "Relishes & Sauces": ["pepper"],
  "Cooked Meat or Poultry": ["chicken"],
  "Cooked Fish": ["salmon/fish"],
  "Cooked Pasta or Grains": ["pasta"],
  "Soup or Stew": [],
  "Vegetable Scrap Bag (for stock)": ["carrot", "onion"],
  "Fried Shallots": ["shallot"],
};

// ============ COMPONENTS ============

// ============ SCRAPS TRACKER ============

function daysBetween(d1, d2) {
  const ms = new Date(d2).setHours(0,0,0,0) - new Date(d1).setHours(0,0,0,0);
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

// One consistent icon + label per storage location, shared across the storage guide,
// the pantry list, and the add form so the same place always looks the same.
const LOCATION_META = {
  pantry:  { label: "Pantry",  Icon: Archive },
  fridge:  { label: "Fridge",  Icon: Refrigerator },
  freezer: { label: "Freezer", Icon: Snowflake },
};
// Small inline location tag: icon + uppercase label. `size` controls the icon.
function LocationTag({ location, className = "", iconClass = "w-3 h-3", style }) {
  const meta = LOCATION_META[location];
  if (!meta) return <span className={className} style={style}>{location}</span>;
  const { label, Icon } = meta;
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} style={style}>
      <Icon className={`${iconClass} flex-shrink-0`} />
      {label}
    </span>
  );
}

// Returns display state for a scrap. When the item has an outer range,
// there are three zones:
//   good     — before the cautious (short) end of the safe storage range
//   usesoon  — inside the range; likely still fine, finish up & trust your senses
//   past     — beyond the outer end; treat as past its prime
// Items with no outer range behave as a single-point expiry (good → past).
function formatDaysLeft(daysToShort, daysToOuter = null) {
  const hasWindow = daysToOuter !== null && daysToOuter > daysToShort;

  // Past the outer end (or past the single point) — over the line.
  const effectiveEnd = hasWindow ? daysToOuter : daysToShort;
  if (effectiveEnd < 0) return { text: "Past its prime", tone: "danger", zone: "past" };

  // Inside the use-soon window: between the short end and the outer end.
  if (hasWindow && daysToShort < 0 && daysToOuter >= 0) {
    return { text: "Use soon — check it before using", tone: "usesoon", zone: "usesoon" };
  }

  // Before the cautious end — good, with a normal countdown.
  const days = daysToShort;
  if (days === 0) return { text: "Use today", tone: "warn", zone: "good" };
  if (days === 1) return { text: "1 day left", tone: "warn", zone: "good" };
  if (days <= 3) return { text: `${days} days left`, tone: "warn", zone: "good" };
  if (days <= 7) return { text: `${days} days left`, tone: "ok", zone: "good" };
  if (days < 30) return { text: `${days} days left`, tone: "ok", zone: "good" };
  if (days < 60) return { text: `~${Math.round(days/7)} weeks left`, tone: "ok", zone: "good" };
  return { text: `~${Math.round(days/30)} months left`, tone: "ok", zone: "good" };
}

// Enrich a single saved scrap with its computed shelf-life status. Pure: takes the
// scrap and today's ISO date, returns the scrap plus daysLeft/zone/needsSoon/etc.
// Shared by the Pantry list and the Home dashboard so they never disagree.
function enrichScrap(s, today) {
  const typeMeta = SCRAP_TYPES.find(t => t.name === s.type);
  const isCustom = !typeMeta;
  const shortDays = typeMeta?.locations[s.location] || 0;
  const outerDays = typeMeta?.outer?.[s.location] ?? null;
  const stored = new Date(s.dateStored);
  const expiresShort = new Date(stored.getTime() + shortDays * 86400000);
  const daysLeft = daysBetween(today, expiresShort);
  const daysToOuter = outerDays !== null
    ? daysBetween(today, new Date(stored.getTime() + outerDays * 86400000))
    : null;
  const sortKey = isCustom ? Infinity : (daysToOuter !== null ? daysToOuter : daysLeft);
  const status = isCustom
    ? { text: "No expiry tracked", zone: "custom", tone: "ok" }
    : formatDaysLeft(daysLeft, daysToOuter);
  const zone = status.zone;
  const needsSoon = !isCustom && (zone === "usesoon" || status.tone === "warn");
  // statusText is the single source of truth for how this item's status reads —
  // the Pantry list, the Builder chips, and the Home dashboard should all show it,
  // so the same item never displays two different countdowns on two screens.
  return { ...s, daysLeft, daysToOuter, expires: expiresShort, typeMeta, isCustom, sortKey, zone, tone: status.tone, statusText: status.text, needsSoon };
}

// Enrich a list of scraps against today's date.
function enrichScraps(scraps, today = new Date().toISOString().slice(0, 10)) {
  return (scraps || []).map(s => enrichScrap(s, today));
}

function ScrapTracker({ scraps, addScrap, removeScrap, seedDemo, clearAll, restoreAll, loaded, openDeepDive, onOpenTemplate, incModal, decModal }) {
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("expiry");   // expiry | added | name | location
  const [filterBy, setFilterBy] = useState("all");  // all | past | usesoon | fridge | freezer | pantry

  // Inline undo: when a row is removed, we don't delete it immediately. We mark it
  // "pending" so its slot in the list shows a "Removed — Undo" strip right where the
  // card was — exactly where the user's eye already is. The real removeScrap fires
  // only when the undo window lapses. Undo cancels it and the card returns.
  const [pendingRemoval, setPendingRemoval] = useState({}); // id -> true
  const removalTimers = useRef({});
  const UNDO_MS = 7000;

  // Tap-to-explain on a row's status: holds the id of the row whose provenance
  // note is open (only one at a time). Tapping the status chip toggles it, so the
  // "why does it say that?" explanation travels with the status itself rather than
  // living only in the page footnote.
  const [explainStatus, setExplainStatus] = useState(null);

  const requestRemove = (id) => {
    setPendingRemoval(prev => ({ ...prev, [id]: true }));
    if (removalTimers.current[id]) clearTimeout(removalTimers.current[id]);
    removalTimers.current[id] = setTimeout(() => {
      removeScrap(id, true);
      delete removalTimers.current[id];
      setPendingRemoval(prev => { const next = { ...prev }; delete next[id]; return next; });
    }, UNDO_MS);
  };
  const undoRemove = (id) => {
    if (removalTimers.current[id]) { clearTimeout(removalTimers.current[id]); delete removalTimers.current[id]; }
    setPendingRemoval(prev => { const next = { ...prev }; delete next[id]; return next; });
  };
  // Clean up any pending timers on unmount (commit nothing extra — storage already
  // only changes when a timer fires).
  useEffect(() => () => { Object.values(removalTimers.current).forEach(clearTimeout); }, []);

  // Inline undo for "Clear pantry" — snapshot the list, clear silently, and show a
  // "Cleared N — Undo" strip right where the Clear button is (bottom of the list),
  // close to the action instead of in a far-off toast.
  const [clearedSnapshot, setClearedSnapshot] = useState(null); // array | null
  const clearTimer = useRef(null);
  const requestClearAll = () => {
    const snap = scraps;
    if (!snap.length) return;
    setClearedSnapshot(snap);
    clearAll(true); // silent — inline strip provides the undo
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => setClearedSnapshot(null), 8000);
  };
  const undoClearAll = () => {
    if (clearTimer.current) { clearTimeout(clearTimer.current); clearTimer.current = null; }
    if (clearedSnapshot && restoreAll) restoreAll(clearedSnapshot);
    setClearedSnapshot(null);
  };
  useEffect(() => () => { if (clearTimer.current) clearTimeout(clearTimer.current); }, []);

  // Compute and sort by urgency
  const today = new Date().toISOString().slice(0, 10);
  const enriched = scraps.map(s => enrichScrap(s, today));

  // "Past prime" = beyond the outer end of the book's range (or past a single-point expiry).
  // Custom items (no known shelf-life) are never counted as past prime.
  const pastPrime = enriched.filter(s => !s.isCustom && s.sortKey < 0);

  // Templates that would help use up the past-prime items, ranked by how many they serve.
  const useUpTemplates = useMemo(() => templatesForScraps(pastPrime).slice(0, 3), [pastPrime]);

  // Counts for the filter control (so options can show how many match, and we can hide
  // status filters that would be empty).
  const filterCounts = useMemo(() => ({
    all: enriched.length,
    past: enriched.filter(s => !s.isCustom && s.sortKey < 0).length,
    usesoon: enriched.filter(s => s.needsSoon).length,
    fridge: enriched.filter(s => s.location === "fridge").length,
    freezer: enriched.filter(s => s.location === "freezer").length,
    pantry: enriched.filter(s => s.location === "pantry").length,
  }), [enriched]);

  // Visible list = filter → text query → sort. Kept as one memoized pipeline.
  const visible = useMemo(() => {
    let list = enriched;
    // Filter
    if (filterBy === "past") list = list.filter(s => !s.isCustom && s.sortKey < 0);
    else if (filterBy === "usesoon") list = list.filter(s => s.needsSoon);
    else if (filterBy === "fridge" || filterBy === "freezer" || filterBy === "pantry") {
      list = list.filter(s => s.location === filterBy);
    }
    // Text query
    const q = query.trim().toLowerCase();
    if (q) list = list.filter(s =>
      [s.label, s.type, s.note, s.location].filter(Boolean).some(f => String(f).toLowerCase().includes(q))
    );
    // Sort (copy first — don't mutate the source array)
    const sorted = [...list];
    if (sortBy === "expiry") sorted.sort((a, b) => a.sortKey - b.sortKey);
    else if (sortBy === "added") sorted.sort((a, b) => String(b.dateStored).localeCompare(String(a.dateStored)));
    else if (sortBy === "name") sorted.sort((a, b) => String(a.label || a.type).localeCompare(String(b.label || b.type)));
    else if (sortBy === "location") sorted.sort((a, b) =>
      String(a.location).localeCompare(String(b.location)) || a.sortKey - b.sortKey
    );
    return sorted;
  }, [enriched, query, filterBy, sortBy]);

  // If a status filter empties out (e.g. user used/tossed the last past-prime item),
  // fall back to All so the list isn't stuck showing nothing.
  useEffect(() => {
    if ((filterBy === "past" || filterBy === "usesoon") && filterCounts[filterBy] === 0) {
      setFilterBy("all");
    }
  }, [filterBy, filterCounts]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-2xl text-[var(--ink)] mb-1">Your Alchemist's Pantry</h3>
        <div className="h-1 w-12 mb-2" style={{ backgroundColor: "var(--spark)" }} />
        <p className="text-sm text-[var(--ink-soft)] italic">A label on a jar isn't just for others. It's a message to your future self.</p>
      </div>

      {/* Search + Add — side by side once there's enough to search; Add alone otherwise */}
      {enriched.length > 3 ? (
        <div className="flex gap-2 items-stretch">
          <div className="flex-1">
            <SearchInput value={query} onChange={setQuery} placeholder="Search your pantry…" />
          </div>
          <button
            onClick={() => setAdding(true)}
            className="flex-shrink-0 flex items-center justify-center gap-1.5 px-4 border-2 border-dashed border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--surface)] transition font-semibold"
            style={{ backgroundColor: "transparent" }}
            aria-label="Add a scrap"
          >
            <Plus className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest">Add</span>
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--surface)] transition font-semibold"
          style={{ backgroundColor: "transparent" }}
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm uppercase tracking-widest">Add a scrap</span>
        </button>
      )}

      {/* Sort + filter controls — a pantry is a list, so give it list controls.
          "Past prime" and "Use soon" fold in here as status filters. */}
      {enriched.length > 3 && (
        <div className="flex gap-2 items-stretch">
          <Dropdown
            label="Sort by"
            icon={ArrowUpDown}
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: "expiry", label: "Use soonest" },
              { value: "added", label: "Recently added" },
              { value: "name", label: "Name (A–Z)" },
              { value: "location", label: "Location" },
            ]}
          />
          <Dropdown
            label="Show"
            icon={ListFilter}
            value={filterBy}
            onChange={setFilterBy}
            active={filterBy !== "all"}
            align="right"
            options={[
              { value: "all", label: `All (${filterCounts.all})` },
              ...(filterCounts.past > 0 ? [{ value: "past", label: `Past prime (${filterCounts.past})` }] : []),
              ...(filterCounts.usesoon > 0 ? [{ value: "usesoon", label: `Use soon (${filterCounts.usesoon})` }] : []),
              ...(filterCounts.fridge > 0 ? [{ value: "fridge", label: `Fridge (${filterCounts.fridge})` }] : []),
              ...(filterCounts.freezer > 0 ? [{ value: "freezer", label: `Freezer (${filterCounts.freezer})` }] : []),
              ...(filterCounts.pantry > 0 ? [{ value: "pantry", label: `Pantry (${filterCounts.pantry})` }] : []),
            ]}
          />
        </div>
      )}

      {/* When viewing past-prime items, offer the "use them up" template shortcuts. */}
      {filterBy === "past" && useUpTemplates.length > 0 && onOpenTemplate && (
        <div className="border border-[var(--accent)] rounded-[3px] p-4" style={{ backgroundColor: "var(--surface-alert)" }}>
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-[var(--accent)] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-display text-sm text-[var(--ink)] font-bold mb-1">Put them to use</div>
              <p className="text-xs text-[var(--ink)] leading-relaxed">
                Trust your senses — if it smells right, looks right, and the storage was sound, you may still have something usable. These templates fit what's here:
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {useUpTemplates.map(name => (
                  <button
                    key={name}
                    onClick={() => onOpenTemplate(name)}
                    className="text-xs px-2 py-1 border border-[var(--accent)] rounded-[3px] text-[var(--accent)] font-semibold inline-flex items-center gap-1 hover:bg-[var(--accent)] hover:text-[var(--surface)] active:bg-[var(--accent)] active:text-[var(--surface)] transition"
                    style={{ backgroundColor: "var(--surface)" }}
                  >
                    {name}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {/* Inline "Cleared — Undo" strip (shows after Clear pantry, near the now-empty list) */}
      {clearedSnapshot && (
        <div
          className="border border-dashed border-[var(--accent)] rounded-[3px] px-4 py-3 flex items-center gap-3"
          style={{ backgroundColor: "var(--surface-alert)" }}
          role="status"
          aria-live="polite"
        >
          <span className="flex-1 text-sm text-[var(--ink-soft)] min-w-0 truncate">
            Cleared <span className="text-[var(--ink)] font-semibold">{clearedSnapshot.length} item{clearedSnapshot.length > 1 ? "s" : ""}</span>
          </span>
          <button
            onClick={undoClearAll}
            className="flex-shrink-0 text-xs uppercase tracking-widest font-bold text-[var(--accent)] hover:text-[var(--ink)] transition"
          >
            Undo
          </button>
        </div>
      )}

      {loaded && enriched.length === 0 && !clearedSnapshot && (
        <div className="p-6 border border-[var(--border)] rounded-[3px] text-center" style={{ backgroundColor: "var(--surface)" }}>
          <Archive className="w-8 h-8 text-[var(--accent)] mx-auto mb-2 opacity-60" />
          <p className="text-sm text-[var(--ink)] mb-1">Your pantry is empty.</p>
          <p className="text-xs italic text-[var(--ink-soft)] mb-4">Save your first jar, brine, or rendered fat to begin.</p>
          {seedDemo && (
            <button
              onClick={seedDemo}
              className="text-xs uppercase tracking-widest px-3 py-1.5 border border-[var(--accent)] rounded-[3px] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--surface)] transition font-semibold"
              style={{ backgroundColor: "transparent" }}
            >
              ✨ Load demo pantry
            </button>
          )}
        </div>
      )}

      {/* Loading state */}
      {!loaded && (
        <div className="p-6 text-center text-sm italic text-[var(--ink-soft)]">Loading your pantry…</div>
      )}

      {/* No results */}
      {enriched.length > 0 && visible.length === 0 && (
        <p className="text-sm italic text-[var(--ink-soft)] text-center py-6">
          {query
            ? `Nothing here matches “${query}”.`
            : "Nothing matches this filter."}
          {(query || filterBy !== "all") && (
            <button
              onClick={() => { setQuery(""); setFilterBy("all"); }}
              className="ml-1 not-italic underline text-[var(--accent)] hover:text-[var(--ink)]"
            >
              Clear
            </button>
          )}
        </p>
      )}

      {/* List */}
      {visible.length > 0 && (
        <div className="space-y-2">
          {visible.map((s, idx) => {
            // Status comes pre-computed from enrichScrap — the shared single source
            // (same text/tone/zone the Builder chips and Home dashboard display).
            const status = { text: s.statusText, tone: s.tone, zone: s.zone };
            const bgTone =
              status.tone === "danger" ? "var(--surface-alert)" :
              status.tone === "usesoon" ? "var(--surface-warm)" :
              status.tone === "warn" ? "var(--surface-warm)" : "var(--surface)";
            const accentColor =
              status.tone === "danger" ? "var(--accent)" :
              status.tone === "usesoon" ? "var(--spark-text)" :
              status.tone === "warn" ? "var(--spark-text)" : "var(--moss)";
            // When sorting by location, print a header at the start of each new group.
            const showLocationHeader = sortBy === "location" && (idx === 0 || visible[idx - 1].location !== s.location);
            return (
              <Fragment key={s.id}>
                {showLocationHeader && (
                  <div className={`flex items-center gap-2 ${idx === 0 ? "" : "pt-3"}`}>
                    <LocationTag location={s.location} className="text-xs uppercase tracking-widest font-bold" iconClass="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                    <span className="flex-1 h-px" style={{ backgroundColor: "var(--border-60)" }} />
                  </div>
                )}
              {pendingRemoval[s.id] ? (
                /* Inline undo strip — sits exactly where the removed card was */
                <div
                  className="border border-dashed border-[var(--accent)] rounded-[3px] px-4 py-3 flex items-center gap-3"
                  style={{ backgroundColor: "var(--surface-alert)" }}
                  role="status"
                  aria-live="polite"
                >
                  <span className="flex-1 text-sm text-[var(--ink-soft)] min-w-0 truncate">
                    Removed <span className="text-[var(--ink)] font-semibold">{s.label || s.type}</span>
                  </span>
                  <button
                    onClick={() => undoRemove(s.id)}
                    className="flex-shrink-0 text-xs uppercase tracking-widest font-bold text-[var(--accent)] hover:text-[var(--ink)] transition"
                  >
                    Undo
                  </button>
                </div>
              ) : (
              <div
                className="border border-[var(--border)] rounded-[3px] p-4"
                style={{ backgroundColor: bgTone }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-display text-lg text-[var(--ink)]">
                        {s.label || s.type}
                      </div>
                    </div>
                    {s.label && (
                      <div className="text-xs text-[var(--ink-soft)] truncate">{s.type}</div>
                    )}
                  </div>
                  <button
                    onClick={() => requestRemove(s.id)}
                    className="text-[var(--ink-soft)] hover:text-[var(--accent)] flex-shrink-0"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <LocationTag location={s.location} className="uppercase tracking-widest text-[var(--ink-soft)]" />
                  <span className="text-[var(--ink-soft)]">
                    Stored {s.dateStored}
                  </span>
                  {status.zone === "custom" ? (
                    <span
                      className="ml-auto font-display font-bold text-right"
                      style={{ color: accentColor }}
                    >
                      {status.text}
                    </span>
                  ) : (
                    <button
                      onClick={() => setExplainStatus(prev => prev === s.id ? null : s.id)}
                      className="ml-auto font-display font-bold text-right inline-flex items-center gap-1 hover:opacity-80 transition"
                      style={{ color: accentColor, borderBottom: "1px dotted currentColor", paddingBottom: "1px" }}
                      aria-expanded={explainStatus === s.id}
                      title="Why this status?"
                    >
                      {status.text}
                      <ChevronDown
                        className="w-3 h-3 flex-shrink-0 transition-transform"
                        style={{ transform: explainStatus === s.id ? "rotate(180deg)" : "none" }}
                      />
                    </button>
                  )}
                </div>
                {explainStatus === s.id && status.zone !== "custom" && (
                  <p className="text-xs italic mt-2 pt-2 border-t border-dashed border-[var(--border-60)] text-[var(--ink-soft)]" role="status" aria-live="polite">
                    {status.zone === "past"
                      ? "Countdowns use the cautious end of each storage range, so this tips to \"past its prime\" a little early. It may well be fine — give it a look and a sniff. When in doubt, throw it out."
                      : status.zone === "usesoon"
                      ? "You're inside the storage range now. Countdowns use the cautious end of the range, so you're nudged to finish up early. Your senses are the final check."
                      : "Countdowns use the cautious end of each storage range, so you're nudged to use items a little early. See Storage & Safety for the full ranges."}
                  </p>
                )}
                {status.zone === "usesoon" && explainStatus !== s.id && (
                  <p className="text-xs italic mt-2 pt-2 border-t border-dashed border-[var(--border-60)] text-[var(--ink-soft)]">
                    This one's getting on in age — still likely fine, but finish it up soon and let your senses be the final check.
                  </p>
                )}
                {status.zone === "custom" && (
                  <p className="text-xs italic mt-2 pt-2 border-t border-dashed border-[var(--border-60)] text-[var(--ink-soft)]">
                    No storage range on file for this one. Note the date, label it well, and trust your senses.
                  </p>
                )}
                {s.typeMeta?.warning && (
                  <p className={`text-xs italic mt-2 pt-2 border-t border-dashed border-[var(--border-60)] ${s.typeMeta.warning.startsWith("⚠️") ? "text-[var(--accent)]" : "text-[var(--ink-soft)]"}`}>
                    {s.typeMeta.warning}
                  </p>
                )}
                {s.note && (
                  <p className="text-xs italic mt-2 pt-2 border-t border-dashed border-[var(--border-60)] text-[var(--ink)]">
                    "{s.note}"
                  </p>
                )}
                {/* Past its prime — surface senses-first suggestions */}
                {status.zone === "past" && (
                  <PastPrimeSuggestion scrap={s} onOpenTemplate={onOpenTemplate} onUsedUp={requestRemove} onDiscard={requestRemove} />
                )}
                {/* Finishing actions — both remove the item, framed honestly:
                    "Used it up" is the win; "Discarded" is when it couldn't be saved.
                    (Shown for non-past items; past-prime items get the same pair inside
                    PastPrimeSuggestion above.) */}
                {status.zone !== "past" && (
                  <div className="mt-3 flex items-center gap-4 flex-wrap">
                    <button
                      onClick={() => requestRemove(s.id)}
                      className="text-xs uppercase tracking-widest text-[var(--accent)] hover:text-[var(--ink)] underline"
                    >
                      Used it up
                    </button>
                    <button
                      onClick={() => requestRemove(s.id)}
                      className="text-xs uppercase tracking-widest text-[var(--ink-soft)] hover:text-[var(--accent)] underline"
                    >
                      Discarded
                    </button>
                    {findDeepDive(s.label || s.type) && openDeepDive && (
                      <button
                        onClick={() => openDeepDive(s.label || s.type)}
                        className="text-xs uppercase tracking-widest text-[var(--accent)] hover:text-[var(--ink)] underline font-semibold"
                      >
                        Learn more →
                      </button>
                    )}
                  </div>
                )}
                {/* Learn more for past-prime items (the Used up / Discarded pair lives
                    in PastPrimeSuggestion for those) */}
                {status.zone === "past" && findDeepDive(s.label || s.type) && openDeepDive && (
                  <div className="mt-3">
                    <button
                      onClick={() => openDeepDive(s.label || s.type)}
                      className="text-xs uppercase tracking-widest text-[var(--accent)] hover:text-[var(--ink)] underline font-semibold"
                    >
                      Learn more →
                    </button>
                  </div>
                )}
              </div>
              )}
              </Fragment>
            );
          })}
        </div>
      )}

      {/* Pact reminder */}
      {enriched.length > 0 && (
        <div className="text-xs italic text-[var(--ink-soft)] text-center pt-4 border-t border-dashed border-[var(--border-60)]">
          When in doubt, throw it out. Knowledge tells you what should be safe; your senses tell you what is.
          <div className="mt-2 not-italic text-[var(--ink-faint)]" style={{ fontSize: "11px" }}>
            Countdowns use the cautious end of each storage range. See Storage &amp; Safety for the full ranges.
          </div>
          {clearAll && (
            <div className="mt-3 not-italic">
              <button
                onClick={requestClearAll}
                className="text-xs uppercase tracking-widest text-[var(--ink-soft)] hover:text-[var(--accent)] underline"
              >
                Clear pantry
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add modal */}
      {adding && (
        <AddScrapModal
          onAdd={(scrap) => { addScrap(scrap); setAdding(false); }}
          onClose={() => setAdding(false)}
          incModal={incModal}
          decModal={decModal}
        />
      )}
    </div>
  );
}

// Past-prime suggestion: surface relevant templates and a senses-first prompt
// Maps a scrap's type to the templates that would put it to good use. Shared by the
// per-item past-prime card and the pantry-wide "use them up" callout so both stay in
// sync. Pure and module-level for testability.
function templatesForScrapType(type) {
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
}

// Given a set of scraps, returns the templates that would help use them up, ranked by
// how many of the scraps each template serves (most-helpful first).
function templatesForScraps(scraps) {
  const tally = new Map();
  for (const s of scraps) {
    for (const name of templatesForScrapType(s.type)) {
      tally.set(name, (tally.get(name) || 0) + 1);
    }
  }
  return [...tally.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
}

function PastPrimeSuggestion({ scrap, onOpenTemplate, onUsedUp, onDiscard }) {
  // Map scrap types to relevant templates (shared logic).
  const suggestions = useMemo(() => templatesForScrapType(scrap.type), [scrap.type]);

  return (
    <div className="mt-3 pt-3 border-t-2 border-[var(--accent-40)]">
      <div className="text-xs uppercase tracking-widest text-[var(--accent)] mb-1.5 font-bold">If your senses say yes</div>
      <p className="text-xs text-[var(--ink)] leading-relaxed mb-2">
        Smell, look, taste a tiny bit. If anything is off — discard it. If it passes, consider:
      </p>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map(name => (
          <button
            key={name}
            onClick={() => onOpenTemplate && onOpenTemplate(name)}
            className="text-xs px-2 py-1 border border-[var(--accent)] rounded-[3px] text-[var(--accent)] font-semibold inline-flex items-center gap-1 hover:bg-[var(--accent)] hover:text-[var(--surface)] active:bg-[var(--accent)] active:text-[var(--surface)] transition"
            style={{ backgroundColor: "var(--surface)" }}
          >
            {name}
            <ArrowRight className="w-3 h-3" />
          </button>
        ))}
      </div>
      {/* Resolve the verdict: used it up, or discarded. Either way, clear it from the pantry. */}
      <div className="mt-3 flex items-center gap-4 flex-wrap">
        {onUsedUp && (
          <button
            onClick={() => onUsedUp(scrap.id)}
            className="text-xs uppercase tracking-widest text-[var(--accent)] hover:text-[var(--ink)] underline"
          >
            Used it up
          </button>
        )}
        {onDiscard && (
          <button
            onClick={() => onDiscard(scrap.id)}
            className="text-xs uppercase tracking-widest text-[var(--ink-soft)] hover:text-[var(--accent)] underline"
          >
            Discarded
          </button>
        )}
      </div>
    </div>
  );
}

function AddScrapModal({ onAdd, onClose, incModal, decModal }) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState(null);
  const [location, setLocation] = useState(null);
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [dateStored, setDateStored] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState("Fats");
  const [typeQuery, setTypeQuery] = useState("");

  useEffect(() => {
    if (incModal) incModal();
    return () => { if (decModal) decModal(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = Array.from(new Set(SCRAP_TYPES.map(s => s.category)));
  const typeQ = typeQuery.trim().toLowerCase();
  // While searching, match type names across ALL categories (with their note/category),
  // so you don't need to know which tab a type lives under.
  const filteredTypes = typeQ
    ? SCRAP_TYPES.filter(t =>
        t.name.toLowerCase().includes(typeQ) ||
        (t.category && t.category.toLowerCase().includes(typeQ)) ||
        (t.note && t.note.toLowerCase().includes(typeQ))
      )
    : SCRAP_TYPES.filter(t => t.category === category);

  const handleSubmit = () => {
    onAdd({
      type: type.name,
      location,
      dateStored,
      label: label.trim(),
      note: note.trim(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-4 overflow-hidden"
      style={{ backgroundColor: "rgba(30, 36, 30, 0.82)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg border border-[var(--ink)] rounded-[3px] shadow-2xl flex flex-col max-h-screen sm:max-h-[90vh]"
        style={{ backgroundColor: "var(--surface)" }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex-shrink-0 border-b-2 border-[var(--ink)] p-4 flex items-center justify-between"
          style={{ backgroundColor: "var(--surface)" }}
        >
          <div>
            <div className="text-xs uppercase tracking-widest text-[var(--accent)]">Step {step} of 2</div>
            <h3 className="font-display text-xl text-[var(--ink)]">
              {step === 1 ? "What are you saving?" : "When and where?"}
            </h3>
          </div>
          <button onClick={onClose} className="text-[var(--ink)] hover:text-[var(--accent)]" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ backgroundColor: "var(--surface)", overscrollBehavior: "contain" }}>
          {step === 1 && (
            <>
              {/* Search — spans all categories */}
              <SearchInput value={typeQuery} onChange={setTypeQuery} placeholder="Search types (confit, brine, fat…)" />

              {/* Category tabs — hidden while searching */}
              {!typeQ && (
                <div className="flex flex-wrap gap-1.5">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className="px-2.5 py-1.5 text-xs uppercase tracking-widest border transition"
                      style={{
                        backgroundColor: category === cat ? "var(--accent)" : "var(--surface)",
                        color: category === cat ? "var(--surface)" : "var(--ink)",
                        borderColor: category === cat ? "var(--accent)" : "var(--border)",
                        fontWeight: category === cat ? 700 : 600,
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {/* Types */}
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {filteredTypes.length === 0 && (
                  <div className="text-center py-4 space-y-3">
                    <p className="text-sm italic text-[var(--ink-soft)]">
                      No preset types match “{typeQuery}”.
                    </p>
                    <button
                      onClick={() => {
                        const customType = {
                          name: typeQuery.trim(),
                          category: "Custom",
                          locations: { fridge: 0, freezer: 0, pantry: 0 },
                          default: "fridge",
                          custom: true,
                        };
                        setType(customType);
                        setLocation("fridge");
                        setStep(2);
                      }}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--surface)] transition font-semibold"
                      style={{ backgroundColor: "transparent" }}
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-sm uppercase tracking-widest">Save “{typeQuery.trim()}” as a custom item</span>
                    </button>
                    <p className="text-xs italic text-[var(--ink-soft)] leading-relaxed px-4">
                      Custom items don't get a storage countdown — note the date, label it, and trust your senses.
                    </p>
                  </div>
                )}
                {filteredTypes.map(t => (
                  <button
                    key={t.name}
                    onClick={() => {
                      setType(t);
                      setLocation(t.default);
                      setStep(2);
                    }}
                    className="w-full text-left p-3 border border-[var(--border)] rounded-[3px] hover:border-[var(--accent)] transition"
                    style={{ backgroundColor: "var(--surface)" }}
                  >
                    <div className="font-display text-sm text-[var(--ink)]">{t.name}</div>
                    <div className="text-xs text-[var(--ink-soft)] mt-0.5">
                      {Object.entries(t.locations).map(([k, v]) =>
                        `${k}: ${v < 30 ? `${v}d` : v < 365 ? `${Math.round(v/30)}mo` : `${Math.round(v/365)}y`}`
                      ).join(" · ")}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && type && (
            <>
              <div className="p-3 border border-[var(--border)] rounded-[3px]" style={{ backgroundColor: "var(--bg)" }}>
                <div className="text-xs uppercase tracking-widest text-[var(--accent)] mb-1">Saving</div>
                <div className="font-display text-base text-[var(--ink)]">{type.name}</div>
              </div>

              {/* Location */}
              {Object.keys(type.locations).length > 1 ? (
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[var(--ink-soft)] mb-2">Where did you store it?</label>
                  <div className="flex gap-2">
                    {Object.keys(type.locations).map(loc => (
                      <button
                        key={loc}
                        onClick={() => setLocation(loc)}
                        className="flex-1 px-3 py-2 text-sm uppercase tracking-widest border transition flex items-center justify-center"
                        style={{
                          backgroundColor: location === loc ? "var(--accent)" : "var(--surface)",
                          color: location === loc ? "var(--surface)" : "var(--ink)",
                          borderColor: location === loc ? "var(--accent)" : "var(--border)",
                          fontWeight: location === loc ? 700 : 400,
                        }}
                      >
                        <LocationTag location={loc} iconClass="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[var(--ink-soft)] mb-2">Storage</label>
                  <div className="px-3 py-2 text-sm border border-[var(--border)] rounded-[3px] uppercase tracking-widest text-[var(--ink)]" style={{ backgroundColor: "var(--surface)" }}>
                    <LocationTag location={Object.keys(type.locations)[0]} iconClass="w-4 h-4" />
                  </div>
                </div>
              )}

              {/* Date */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-[var(--ink-soft)] mb-2">Date stored</label>
                <input
                  type="date"
                  value={dateStored}
                  onChange={e => setDateStored(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[3px] focus:border-[var(--accent)] outline-none text-[var(--ink)]"
                  style={{ backgroundColor: "var(--surface)" }}
                />
              </div>

              {/* Custom label */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-[var(--ink-soft)] mb-2">
                  Label <span className="lowercase tracking-normal italic">(optional)</span>
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="e.g. Apple-parsnip oil"
                  className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[3px] focus:border-[var(--accent)] outline-none text-[var(--ink)]"
                  style={{ backgroundColor: "var(--surface)" }}
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-[var(--ink-soft)] mb-2">
                  Note to future you <span className="lowercase tracking-normal italic">(optional)</span>
                </label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="From Sunday's confit, save for popcorn"
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[3px] focus:border-[var(--accent)] outline-none text-[var(--ink)] resize-none"
                  style={{ backgroundColor: "var(--surface)" }}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-sm uppercase tracking-widest border border-[var(--border)] rounded-[3px] text-[var(--ink)] hover:border-[var(--accent)]"
                  style={{ backgroundColor: "var(--surface)" }}
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!location}
                  className="flex-1 px-4 py-2 text-sm uppercase tracking-widest bg-[var(--accent)] text-[var(--surface)] hover:bg-[var(--accent-deep)] disabled:opacity-50"
                >
                  Save to pantry
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ TODAY BANNER ============

// Computes which welcome day or monthly template is "current" and unread,
// and renders a dismissable banner at the top of the meal builder.
function TodayBanner({ engagement, dismissedItems, onDismiss, onTabChange, onOpenDeepDive, onOpenTemplate }) {
  if (!engagement?.firstOpenAt) return null;

  // Day count since first install
  const daysInstalled = Math.floor(
    (Date.now() - new Date(engagement.firstOpenAt).getTime()) / 86400000
  );

  // Welcome series: days 1–7 of installation
  // Day 1 = first day open, Day 7 = a week in
  const welcomeDay = daysInstalled + 1;
  let welcomeItem = null;
  if (welcomeDay <= 7) {
    const item = WELCOME_SERIES.find(w => w.day === welcomeDay);
    if (item && !dismissedItems.includes(`welcome-${item.day}`)) {
      welcomeItem = item;
    }
  }

  // Monthly template: based on current calendar month, but only show
  // if the user has been around long enough to have seen it (1+ day).
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const monthlyItem = (() => {
    if (daysInstalled < 1) return null;
    const item = MONTHLY_TEMPLATES.find(m => m.month === currentMonth);
    if (!item) return null;
    // Use month + year as the dismiss key so it re-shows next year
    const key = `monthly-${currentMonth}-${now.getFullYear()}`;
    if (dismissedItems.includes(key)) return null;
    return { ...item, _key: key };
  })();

  // Welcome series takes precedence in week one
  const item = welcomeItem || monthlyItem;
  if (!item) return null;

  const isWelcome = !!welcomeItem;
  const dismissKey = isWelcome ? `welcome-${item.day}` : item._key;
  const label = isWelcome ? `Day ${item.day} of 7` : `This month's template`;

  return (
    <div
      className="border border-[var(--accent)] rounded-[3px] p-4 sm:p-5 relative"
      style={{ backgroundColor: "var(--surface-warm)" }}
    >
      <button
        onClick={() => onDismiss(dismissKey)}
        className="absolute top-2 right-2 text-[var(--ink-soft)] hover:text-[var(--ink)] p-1"
        title="Dismiss"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="text-xs uppercase tracking-widest text-[var(--accent)] font-bold mb-1">
        {label}
      </div>
      <h4 className="font-display text-lg sm:text-xl text-[var(--ink)] mb-2 pr-6">
        {item.title}
      </h4>
      <LinkedProse
        text={item.body}
        onOpenDeepDive={onOpenDeepDive}
        onOpenTemplate={onOpenTemplate}
        className="text-sm text-[var(--ink)] leading-relaxed mb-3"
      />
      {item.cta && onTabChange && (
        <button
          onClick={() => { onTabChange(item.cta.tab); onDismiss(dismissKey); }}
          className="text-xs uppercase tracking-widest text-[var(--accent)] hover:text-[var(--ink)] font-bold flex items-center gap-1.5"
        >
          {item.cta.label} <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ============ EXISTING COMPONENTS ============

function MealBuilder({ scraps = [], addToScrapbook, openDeepDive, bumpEngagement, incModal, decModal, engagement, dismissedItems = [], dismissItem, onTabChange, startTab = "home" }) {
  const [selected, setSelected] = useState([]);
  const [selectedScraps, setSelectedScraps] = useState([]);
  const [activeCategory, setActiveCategory] = useState("proteins");
  const [openTemplate, setOpenTemplate] = useState(null);
  const [query, setQuery] = useState("");

  // When searching, match ingredient names across ALL categories (so you don't
  // need to know which category an item lives in). Each result carries its category.
  const searchHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null; // null = not searching; show normal category view
    const hits = [];
    const seen = new Set();
    for (const cat of Object.keys(PANTRY)) {
      for (const item of PANTRY[cat]) {
        if (item.toLowerCase().includes(q) && !seen.has(item)) {
          seen.add(item);
          hits.push(item);
        }
      }
    }
    return hits;
  }, [query]);

  const toggle = (item) => {
    setSelected(s => s.includes(item) ? s.filter(x => x !== item) : [...s, item]);
  };
  const toggleScrap = (id) => {
    setSelectedScraps(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  // Filter scraps to ones still usable (not past the outer end of the book's range).
  // Uses the shared enrichScrap so this can never disagree with the Pantry. Custom
  // items (no known shelf-life) get sortKey = Infinity there, so they stay selectable
  // indefinitely and sort last — previously an inline duplicate of this logic treated
  // customs as 0-day items and silently dropped them from the Builder after day one.
  const today = new Date().toISOString().slice(0, 10);
  const usableScraps = useMemo(() => {
    return scraps.map(s => enrichScrap(s, today))
      .filter(s => s.sortKey >= 0)
      .sort((a, b) => a.sortKey - b.sortKey);
  }, [scraps, today]);

  // Combine fresh ingredients + tags from selected scraps for the matcher
  const allIngredientsForMatcher = useMemo(() => {
    const fromScraps = selectedScraps.flatMap(id => {
      const scrap = scraps.find(s => s.id === id);
      return scrap ? (SCRAP_TAGS[scrap.type] || []) : [];
    });
    return [...selected, ...fromScraps];
  }, [selected, selectedScraps, scraps]);

  const matches = useMemo(() => matchTemplates(allIngredientsForMatcher), [allIngredientsForMatcher]);

  const totalSelected = selected.length + selectedScraps.length;

  // When user opens a template from the builder
  const handleOpenTemplate = (templateName) => {
    setOpenTemplate(templateName);
    if (bumpEngagement) bumpEngagement("builderUses");
  };

  return (
    <div className="space-y-6">
      {/* Today / welcome banner — only as a fallback when the user opens on the
          Builder (or any non-Home tab). When Home is the start tab, the daily card
          lives there instead, so we don't double it up. */}
      {startTab !== "home" && engagement && dismissItem && (
        <TodayBanner
          engagement={engagement}
          dismissedItems={dismissedItems}
          onDismiss={dismissItem}
          onTabChange={onTabChange}
          onOpenDeepDive={openDeepDive}
          onOpenTemplate={setOpenTemplate}
        />
      )}

      <div>
        <h3 className="font-display text-2xl text-[var(--ink)] mb-1">What's in your kitchen?</h3>
        <div className="h-1 w-12 mb-2" style={{ backgroundColor: "var(--spark)" }} />
        <p className="text-sm text-[var(--ink-soft)] italic">Tap what you have. The book's templates will surface what you can build.</p>
      </div>

      {/* Search — directly under the header. Finds an ingredient across all categories. */}
      <SearchInput value={query} onChange={setQuery} placeholder="Search ingredients (parmesan, egg, lemon…)" />

      {/* Saved scraps from pantry — only show if user has any */}
      {usableScraps.length > 0 && (
        <div className="border border-[var(--accent-40)] p-4" style={{ backgroundColor: "var(--surface)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Archive className="w-4 h-4 text-[var(--accent)]" />
            <h4 className="text-xs uppercase tracking-widest text-[var(--accent)] font-bold">From your pantry</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {usableScraps.map(s => {
              const isSel = selectedScraps.includes(s.id);
              // Status comes pre-computed from enrichScrap (statusText/tone/zone) —
              // one source of truth shared with the Pantry and the Home dashboard.
              const status = { text: s.statusText, tone: s.tone, zone: s.zone };
              return (
                <button
                  key={s.id}
                  onClick={() => toggleScrap(s.id)}
                  className="px-3 py-1.5 text-sm border transition flex items-center gap-1.5"
                  style={{
                    backgroundColor: isSel ? "var(--accent)" : "var(--surface)",
                    color: isSel ? "var(--surface)" : "var(--ink)",
                    borderColor: isSel ? "var(--accent)" : "var(--border)",
                    fontWeight: isSel ? 600 : 400,
                  }}
                >
                  {isSel && <Check className="w-3 h-3" />}
                  <span>{s.label || s.type}</span>
                  {status.zone !== "custom" && (
                    <span
                      className="text-[10px] uppercase tracking-widest"
                      style={{ color: isSel ? "var(--surface)" : (status.tone === "warn" || status.tone === "usesoon") ? "var(--spark-text)" : "var(--moss)" }}
                    >
                      · {status.zone === "usesoon" ? "Use soon" : status.text}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Category tabs — hidden while searching, since results span categories */}
      {!searchHits && (
        <div className="flex flex-wrap gap-2 border-b border-[var(--border-40)] pb-3">
          {Object.keys(PANTRY).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="px-3 py-1.5 text-xs uppercase tracking-widest transition border font-bold"
              style={{
                backgroundColor: activeCategory === cat ? "var(--accent)" : "var(--surface)",
                color: activeCategory === cat ? "var(--surface)" : "var(--ink)",
                borderColor: activeCategory === cat ? "var(--accent)" : "var(--border)",
                fontWeight: activeCategory === cat ? 700 : 600,
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* No search results */}
      {searchHits && searchHits.length === 0 && (
        <p className="text-sm italic text-[var(--ink-soft)] text-center py-6">
          No ingredients match “{query}”. You can still tap items in their category, or save anything as a scrap in My Pantry.
        </p>
      )}

      {/* Items */}
      <div className="flex flex-wrap gap-2">
        {(searchHits || PANTRY[activeCategory]).map(item => {
          const isSel = selected.includes(item);
          const hasDive = !!findDeepDive(item);
          return (
            <div
              key={item}
              className={`flex border transition ${
                isSel
                  ? "border-[var(--accent)] shadow-sm"
                  : "border-[var(--border)] hover:border-[var(--accent)]"
              }`}
              style={{ backgroundColor: isSel ? "var(--accent)" : "var(--surface)" }}
            >
              <button
                onClick={() => toggle(item)}
                className="px-3 py-1.5 text-sm transition"
                style={{ color: isSel ? "var(--surface)" : "var(--ink)", fontWeight: isSel ? 600 : 400 }}
              >
                {isSel && <Check className="inline w-3 h-3 mr-1" />}
                {item}
              </button>
              {hasDive && openDeepDive && (
                <button
                  onClick={(e) => { e.stopPropagation(); openDeepDive(item); }}
                  className="px-2 border-l-2 transition"
                  style={{
                    borderColor: isSel ? "var(--surface-30)" : "var(--border)",
                    color: isSel ? "var(--surface)" : "var(--accent)",
                  }}
                  title={`Learn about ${item}`}
                  aria-label={`Learn about ${item}`}
                >
                  <span className="text-xs font-bold">ⓘ</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected ingredients */}
      {totalSelected > 0 && (
        <div className="p-4 border border-dashed border-[var(--border)]" style={{ backgroundColor: "var(--surface)" }}>
          <div className="text-xs uppercase tracking-widest text-[var(--ink-soft)] mb-2">On hand ({totalSelected})</div>
          <div className="flex flex-wrap gap-1.5 items-center">
            {selected.map(item => (
              <span key={item} className="inline-flex items-center gap-1 px-2 py-1 text-xs" style={{ backgroundColor: "var(--accent)", color: "var(--surface)" }}>
                {item}
                <button onClick={() => toggle(item)} style={{ color: "var(--surface)" }} aria-label={`Remove ${item}`}><X className="w-3 h-3" /></button>
              </span>
            ))}
            {selectedScraps.map(id => {
              const scrap = scraps.find(s => s.id === id);
              if (!scrap) return null;
              return (
                <span key={id} className="inline-flex items-center gap-1 px-2 py-1 text-xs" style={{ backgroundColor: "var(--moss)", color: "var(--surface)" }}>
                  <Archive className="w-3 h-3" />
                  {scrap.label || scrap.type}
                  <button onClick={() => toggleScrap(id)} style={{ color: "var(--surface)" }} aria-label={`Remove ${scrap.label || scrap.type}`}><X className="w-3 h-3" /></button>
                </span>
              );
            })}
            <button
              onClick={() => { setSelected([]); setSelectedScraps([]); }}
              className="ml-auto text-xs text-[var(--accent)] underline"
            >
              clear all
            </button>
          </div>
        </div>
      )}

      {/* Matches */}
      {totalSelected > 0 && (
        <div>
          <h4 className="font-display text-xl text-[var(--ink)] mb-3">What you can build</h4>
          {matches.length === 0 ? (
            <div className="p-4 border border-[var(--border)] rounded-[3px] text-sm text-[var(--ink-soft)] italic" style={{ backgroundColor: "var(--surface)" }}>
              Add a starting ingredient — pasta, potatoes, fresh herbs, an acid, or sturdy aromatics — to unlock templates.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Group: anchored matches */}
              {matches.some(m => m.needsMet) && (
                <div className="grid sm:grid-cols-2 gap-3">
                  {matches.filter(m => m.needsMet).map(m => (
                    <button
                      key={m.name}
                      onClick={() => handleOpenTemplate(m.name)}
                      className="text-left p-4 border border-[var(--border)] rounded-[3px] hover:border-[var(--accent)] active:border-[var(--accent)] hover:shadow-sm transition"
                      style={{ backgroundColor: "var(--surface)" }}
                    >
                      <div className="flex items-start justify-between mb-1 gap-2">
                        <h5 className="font-display text-lg text-[var(--ink)]">{m.name}</h5>
                        <BookOpen className="w-4 h-4 text-[var(--accent)] flex-shrink-0 mt-1" />
                      </div>
                      <p className="text-xs text-[var(--ink-soft)] italic mb-2">{m.tagline}</p>
                      <div className="flex items-center gap-2 mb-2">
                        {m.boostMatches > 0 && (
                          <div className="flex gap-0.5">
                            {[...Array(Math.min(m.boostMatches, 5))].map((_, i) => (
                              <span key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                            ))}
                          </div>
                        )}
                        <span className="text-xs text-[var(--ink-soft)]">
                          {m.boostMatches > 0
                            ? `${m.boostMatches} of your items fit`
                            : "Ready to build with what you have"}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--ink)] leading-relaxed">{m.blurb}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Group: ideas (unanchored, but boost-matched) */}
              {matches.some(m => !m.needsMet) && (
                <div>
                  <div className="flex items-baseline gap-2 mb-2 mt-4">
                    <h5 className="text-xs uppercase tracking-widest text-[var(--accent)] font-bold">Ideas to explore</h5>
                    <span className="text-xs italic text-[var(--ink-soft)]">add a starting ingredient to unlock</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {matches.filter(m => !m.needsMet).map(m => (
                      <button
                        key={m.name}
                        onClick={() => handleOpenTemplate(m.name)}
                        className="text-left p-4 border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] active:border-[var(--accent)] hover:shadow-sm transition"
                        style={{ backgroundColor: "var(--surface)" }}
                      >
                        <div className="flex items-start justify-between mb-1 gap-2">
                          <h5 className="font-display text-lg text-[var(--ink)]">{m.name}</h5>
                          <BookOpen className="w-4 h-4 text-[var(--accent)] flex-shrink-0 mt-1" />
                        </div>
                        <p className="text-xs text-[var(--ink-soft)] italic mb-2">{m.tagline}</p>
                        {m.hint && (
                          <div className="text-xs text-[var(--accent)] mb-2 flex items-start gap-1">
                            <span className="font-bold">→</span>
                            <span className="italic">{m.hint}</span>
                          </div>
                        )}
                        <p className="text-xs text-[var(--ink)] leading-relaxed">{m.blurb}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Template detail modal */}
      {openTemplate && (
        <TemplateModal
          name={openTemplate}
          onClose={() => setOpenTemplate(null)}
          addToScrapbook={addToScrapbook}
          openDeepDive={openDeepDive}
          incModal={incModal}
          decModal={decModal}
          seedScraps={selectedScraps.map(id => scraps.find(s => s.id === id)).filter(Boolean)}
          seedIngredients={selected}
        />
      )}
    </div>
  );
}


function TemplateBrowser({ onOpenTemplate }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TEMPLATES;
    return TEMPLATES.filter(t =>
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.tagline && t.tagline.toLowerCase().includes(q)) ||
      (t.blurb && t.blurb.toLowerCase().includes(q))
    );
  }, [query]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-2xl text-[var(--ink)] mb-1">The Templates</h3>
        <div className="h-1 w-12 mb-2" style={{ backgroundColor: "var(--spark)" }} />
        <p className="text-sm text-[var(--ink-soft)] italic">Walk through any of the book's frameworks. Tap to open.</p>
      </div>
      <SearchInput value={query} onChange={setQuery} placeholder="Search templates (pesto, hash, oil…)" />
      <div className="grid sm:grid-cols-2 gap-3">
        {filtered.map(t => (
          <button
            key={t.name}
            onClick={() => onOpenTemplate(t.name)}
            className="text-left p-4 bg-[var(--surface)] border border-[var(--border)] rounded-[3px] hover:border-[var(--accent)] active:border-[var(--accent)] transition"
          >
            <div className="flex items-start justify-between mb-1 gap-2">
              <h5 className="font-display text-lg text-[var(--ink)]">{t.name}</h5>
              <BookOpen className="w-4 h-4 text-[var(--accent)] flex-shrink-0 mt-1" />
            </div>
            <p className="text-xs text-[var(--ink-soft)] italic mb-2">{t.tagline}</p>
            <p className="text-xs text-[var(--ink)] leading-relaxed">{t.blurb}</p>
          </button>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-sm italic text-[var(--ink-soft)] text-center py-6">
          No templates match “{query}”. Every template is a flexible method — try a broader word.
        </p>
      )}
    </div>
  );
}

function TemplateModal({ name, onClose, onBack, addToScrapbook, openDeepDive, incModal, decModal, seedScraps = [], seedIngredients = [], initialMode }) {
  const detail = TEMPLATE_DETAILS[name];
  const builder = BUILDER_RECIPES[name];
  const story = TEMPLATE_STORIES[name];
  const tpl = TEMPLATES.find(t => t.name === name);
  // If scraps or ingredients were seeded, default to builder mode (user is clearly trying to build).
  // Otherwise honor explicit initialMode or fall back to framework.
  const computeInitialMode = () => {
    if (initialMode) return initialMode;
    if ((seedScraps.length > 0 || seedIngredients.length > 0) && builder) return "builder";
    return "framework";
  };
  const [mode, setMode] = useState(computeInitialMode); // 'framework' | 'builder' | 'story'
  const contentRef = useRef(null);

  useEffect(() => {
    if (incModal) incModal();
    return () => { if (decModal) decModal(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset the content scroll to the top whenever the tab changes, so switching to a
  // shorter tab doesn't leave you stranded mid-scroll or in dead space.
  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [mode]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-4 overflow-hidden"
      style={{ backgroundColor: "rgba(30, 36, 30, 0.82)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl border border-[var(--ink)] rounded-[3px] shadow-2xl flex flex-col max-h-screen sm:max-h-[90vh]"
        style={{ backgroundColor: "var(--surface)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header — fixed; never scrolls */}
        <div
          className="flex-shrink-0 border-b-2 border-[var(--ink)] p-4 sm:p-5"
          style={{ backgroundColor: "var(--surface)" }}
        >
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--accent)] hover:text-[var(--ink)] mb-2 -ml-1"
              aria-label="Back to previous"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-xl sm:text-2xl text-[var(--ink)] truncate">{name}</h3>
            <button onClick={onClose} className="text-[var(--ink)] hover:text-[var(--accent)] flex-shrink-0" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode tabs — fixed; never scroll */}
        {(builder || story) && (
          <div
            className="flex-shrink-0 border-b border-[var(--border)] flex"
            style={{ backgroundColor: "var(--surface)" }}
          >
            <button
              onClick={() => setMode("framework")}
              className={`flex-1 px-3 py-2.5 text-xs uppercase tracking-widest border-b-2 transition flex items-center justify-center gap-1.5 ${
                mode === "framework"
                  ? "border-[var(--accent)] text-[var(--ink)] font-bold"
                  : "border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Framework
            </button>
            {builder && (
              <button
                onClick={() => setMode("builder")}
                className={`flex-1 px-3 py-2.5 text-xs uppercase tracking-widest border-b-2 transition flex items-center justify-center gap-1.5 ${
                  mode === "builder"
                    ? "border-[var(--accent)] text-[var(--ink)] font-bold"
                    : "border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]"
                }`}
              >
                <Wand2 className="w-3.5 h-3.5" />
                Build mine
              </button>
            )}
            {story && (
              <button
                onClick={() => setMode("story")}
                className={`flex-1 px-3 py-2.5 text-xs uppercase tracking-widest border-b-2 transition flex items-center justify-center gap-1.5 ${
                  mode === "story"
                    ? "border-[var(--accent)] text-[var(--ink)] font-bold"
                    : "border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]"
                }`}
              >
                <Quote className="w-3.5 h-3.5" />
                Story
              </button>
            )}
          </div>
        )}

        {/* Content — the ONLY scrolling region; header & tabs stay pinned above */}
        <div ref={contentRef} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5" style={{ backgroundColor: "var(--surface)", overscrollBehavior: "contain" }}>
          {mode === "framework" && (
            <>
              {detail ? detail.parts.map((part, i) => (
                <div key={i} className="border-l-2 border-[var(--gold)] pl-4">
                  <div className="text-xs uppercase tracking-widest text-[var(--accent)] mb-1">{part.label}</div>
                  <LinkedProse text={part.text} onOpenDeepDive={openDeepDive} className="text-sm text-[var(--ink)] leading-relaxed" />
                </div>
              )) : (
                <div className="space-y-4">
                  {tpl ? (
                    <>
                      <p className="text-xs uppercase tracking-widest text-[var(--accent)]">{tpl.tagline}</p>
                      <LinkedProse text={tpl.blurb} onOpenDeepDive={openDeepDive} className="text-sm text-[var(--ink)] leading-relaxed" />
                    </>
                  ) : (
                    <p className="text-sm italic text-[var(--ink-soft)]">This template's step-by-step walkthrough isn't in the app yet.</p>
                  )}
                  {builder && (
                    <button
                      onClick={() => setMode("builder")}
                      className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-[var(--accent)] hover:text-[var(--ink)] underline font-semibold"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      Build mine →
                    </button>
                  )}
                  {story && (
                    <button
                      onClick={() => setMode("story")}
                      className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-[var(--accent)] hover:text-[var(--ink)] underline font-semibold"
                    >
                      <Quote className="w-3.5 h-3.5" />
                      Read the story →
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {mode === "builder" && builder && (
            <RecipeBuilder
              name={name}
              builder={builder}
              addToScrapbook={addToScrapbook}
              seedScraps={seedScraps}
              seedIngredients={seedIngredients}
              incModal={incModal}
              decModal={decModal}
            />
          )}

          {mode === "story" && story && (
            <div className="space-y-4">
              <div className="text-xs uppercase tracking-widest text-[var(--accent)]">{story.chapter}</div>
              <h4 className="font-display text-2xl text-[var(--ink)] italic">"{story.title}"</h4>
              <div className="border-l-4 border-[var(--gold)] pl-4">
                <LinkedProse text={story.text} onOpenDeepDive={openDeepDive} className="text-sm text-[var(--ink)] leading-relaxed italic" />
              </div>
              <div className="text-xs italic text-[var(--ink-soft)] text-center pt-3 border-t border-dashed border-[var(--border-60)]">
                — from <span className="font-display">Scrap Alchemy</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper: given a list of saved scrap objects, pre-fill builder slots whose options
// share a meaningful keyword with the scrap's type. Robust keyword matching rather
// than brittle per-item rules: a saved "Parmesan Rinds" fills a "Grated Parmesan" OR
// a "Parmesan rind from your pantry" option; "Fried Shallots" fills any shallot option.
const SCRAP_KEYWORDS = [
  // [keyword to look for in an option name, list of scrap-type substrings that imply it]
  { key: "confit oil", types: ["confit"] },
  { key: "confit", types: ["confit"] },
  { key: "rendered fat", types: ["rendered fat", "schmaltz"] },
  { key: "bacon", types: ["rendered fat", "bacon"] },
  { key: "fried shallot", types: ["fried shallot"] },
  { key: "shallot", types: ["fried shallot"] },
  { key: "parmesan", types: ["parmesan"] },
  { key: "vegetable scrap", types: ["vegetable scrap"] },
  { key: "mystery stock", types: ["soup", "stew", "stock", "broth"] },
  { key: "stock", types: ["soup", "stew", "stock", "broth", "vegetable scrap"] },
  { key: "pickle", types: ["pickle brine"] },
  { key: "brine", types: ["pickle brine"] },
  { key: "vinegar", types: ["infused vinegar", "vinegar"] },
  { key: "anchov", types: ["anchov"] },
  { key: "garlic", types: ["confit garlic", "garlic"] },
  { key: "citrus", types: ["citrus", "lemon", "lime"] },
  { key: "lemon", types: ["citrus", "lemon"] },
];

function computeInitialPicksFromScraps(builder, scraps) {
  if (!builder || !scraps || scraps.length === 0) return {};
  const initial = {};
  for (const slot of builder.slots) {
    for (const scrap of scraps) {
      if (initial[slot.id]) break;
      const scrapType = (scrap.type || "").toLowerCase();
      // Prefer an option that explicitly references the pantry (most specific),
      // otherwise any option whose name shares a keyword with this scrap type.
      const candidates = slot.options.filter(opt => {
        const optName = opt.name.toLowerCase();
        return SCRAP_KEYWORDS.some(rule =>
          optName.includes(rule.key) && rule.types.some(t => scrapType.includes(t))
        );
      });
      if (candidates.length) {
        const pantryFirst = candidates.find(o => o.name.toLowerCase().includes("pantry")) || candidates[0];
        initial[slot.id] = pantryFirst.name;
      }
    }
  }
  return initial;
}

// Helper: match plain tapped ingredient names (e.g. "Garlic", "Lemon", "Spaghetti")
// against builder slot options by keyword overlap. Conservative: only fills a slot
// when an option clearly contains the ingredient word, and never overrides an
// already-filled slot.
function computeInitialPicksFromIngredients(builder, ingredients, existing = {}) {
  if (!builder || !ingredients || ingredients.length === 0) return existing;
  const initial = { ...existing };
  // Normalize ingredient names to lowercase singular-ish keywords.
  const words = ingredients.map(i => i.toLowerCase().replace(/\/.*$/, "").trim());
  for (const slot of builder.slots) {
    if (initial[slot.id]) continue; // don't override an existing pick (e.g. from scraps)
    // A slot can hold MULTIPLE carried-in ingredients (e.g. carrot AND shallot both
    // confit in The Ingredient). Collect every option that matches any carried-in
    // word — not just the first — or one ingredient silently wins and the rest vanish.
    const matches = slot.options.filter(opt => {
      // Don't let a single carried-in ingredient auto-select a COMBO option just
      // because the combo name happens to contain that word (e.g. carrot should not
      // trigger "Apples + parsnips + carrots", which also drags in apples & parsnips).
      if (isComboName(opt.name)) return false;
      const optName = opt.name.toLowerCase();
      return words.some(w => w.length >= 3 && optName.includes(w));
    });
    if (matches.length === 1) initial[slot.id] = matches[0].name;
    else if (matches.length > 1) initial[slot.id] = matches.map(m => m.name);
  }
  return initial;
}

// Combined: scraps take priority (more specific), then plain ingredients fill the rest.
function computeInitialPicks(builder, scraps, ingredients) {
  const fromScraps = computeInitialPicksFromScraps(builder, scraps);
  return computeInitialPicksFromIngredients(builder, ingredients, fromScraps);
}

// ---- Texture caveats -----------------------------------------------------------
// The book is explicit that some ingredients don't hold their shape with certain
// methods (esp. confit). We surface its own guidance rather than silently
// suggesting something that will surprise the cook. We don't BLOCK these — the book
// endorses experimenting — we just flag the likely result.
const TEXTURE_CAVEATS = [
  {
    match: ["potato", "sweet potato"],
    methods: ["confit"],
    note: "High starch — will turn soft. Lovely as a mash, spread, or soup base.",
  },
  {
    // Fresh, high-water produce only. NOT dried spices (peppercorns, etc.).
    match: ["tomato", "cherry tomato", "zucchini", "summer squash", "cucumber", "broccoli", "mushroom", "bell pepper", "eggplant", "asparagus"],
    methods: ["confit"],
    note: "High water — may lose its shape. Great when you want a jammy, spoonable result.",
  },
  {
    match: ["apple", "pear", "peach", "berry", "fruit"],
    methods: ["confit"],
    note: "Soft-fleshed — won't hold shape, but makes a fragrant, tender compote.",
  },
];

// Dried/woody things that share a word with produce but DON'T go mushy — never flag.
const TEXTURE_CAVEAT_EXCLUSIONS = [
  "peppercorn", "pepper corn", "black pepper", "white pepper", "sichuan",
  "cinnamon", "clove", "allspice", "star anise", "anise", "bay lea", "bay leaf",
  "dried", "ground", "powder", "seed", "stick", "sprig", "flake", "chili", "chilli",
];

// Return the book's texture caveat for an ingredient in a given template context, or null.
function textureCaveatFor(ingredientLabel, templateName) {
  const w = (ingredientLabel || "").toLowerCase();
  const t = (templateName || "").toLowerCase();
  const method = t.includes("confit") ? "confit" : null;
  if (!method) return null;
  // If the option is clearly a dried/woody spice or aromatic, never flag it.
  if (TEXTURE_CAVEAT_EXCLUSIONS.some(x => w.includes(x))) return null;
  for (const c of TEXTURE_CAVEATS) {
    if (!c.methods.includes(method)) continue;
    // Leading word-boundary match, allowing plurals/suffixes ("potato" → "potatoes").
    // We exclude dried-spice terms above, so this won't catch "peppercorns".
    if (c.match.some(m => new RegExp(`\\b${m.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}`).test(w))) {
      return c.note;
    }
  }
  return null;
}

// ---- Injected-ingredient system ----------------------------------------------
// When a user arrives at the builder carrying ingredients they picked in the meal
// builder (or saved pantry scraps), some of those won't exist among a slot's
// curated options. We inject them as session-only, top-pinned, selectable options.

// Loose role hints: which slot id/label keywords a given ingredient word belongs with.
// Used to decide which slot an unmatched ingredient should be offered in.
const SLOT_ROLE_HINTS = [
  { words: ["chicken", "beef", "steak", "pork", "ground meat", "salmon", "fish", "shrimp", "sausage", "bacon", "eggs", "tofu"], slotKeys: ["protein", "ingredient", "body", "base"] },
  { words: ["potato", "sweet potato", "rice", "pasta", "bread", "tortilla", "quinoa", "oats", "beans", "grain"], slotKeys: ["starch", "base", "ingredient", "pasta", "body"] },
  { words: ["onion", "garlic", "shallot", "carrot", "tomato", "pepper", "mushroom", "broccoli", "kale", "spinach"], slotKeys: ["ingredient", "veg", "green", "body", "aromatic", "starch"] },
  { words: ["lemon", "lime", "vinegar", "pickle brine"], slotKeys: ["acid", "brightness", "pungency", "finish"] },
  { words: ["olive oil", "butter", "oil"], slotKeys: ["fat", "oil"] },
  { words: ["parmesan", "anchovy", "soy sauce"], slotKeys: ["umami"] },
  { words: ["basil", "parsley", "cilantro", "thyme", "rosemary", "dill", "old bay"], slotKeys: ["herb", "green", "aromatic", "freshness", "finish"] },
];

// Normalize a label to a lowercase keyword (drops "/..." and parentheticals).
function normIngredient(label) {
  return (label || "").toLowerCase().replace(/\(.*?\)/g, "").replace(/\/.*$/, "").trim();
}

// Does this slot already contain an option matching this ingredient word?
function slotHasOption(slot, word) {
  return slot.options.some(o => o.name.toLowerCase().includes(word));
}

// Decide the best slot for an ingredient: first a slot whose options already
// reference it (handled elsewhere as a normal match), else a slot whose id/label
// matches the ingredient's role hint. Returns slotId or null.
function bestSlotForIngredient(builder, word) {
  // role-hint match against slot id/label
  for (const hint of SLOT_ROLE_HINTS) {
    if (hint.words.some(w => word.includes(w) || w.includes(word))) {
      const slot = builder.slots.find(s =>
        hint.slotKeys.some(k => s.id.toLowerCase().includes(k) || s.label.toLowerCase().includes(k))
      );
      if (slot) return slot.id;
    }
  }
  return null;
}

// Build the session injection map: { bySlot: {slotId: [{name, note, injected:true}]},
// unplaced: [labels], all: [labels] }. Only ingredients NOT already a curated option
// in their target slot get injected (so we don't duplicate the curated list).
function computeInjections(builder, seedScraps = [], seedIngredients = []) {
  const bySlot = {};
  const unplaced = [];
  const labels = [];
  // Meal-builder ingredients are plain labels; scraps carry a .type and optional .label.
  for (const ing of seedIngredients) labels.push(ing);
  for (const s of seedScraps) labels.push(s.label || s.type);

  for (const label of labels) {
    const word = normIngredient(label);
    if (!word || word.length < 3) { continue; }
    // If some slot already curates this ingredient, it'll auto-pick there — not injected.
    const curatedSlot = builder.slots.find(slot => slotHasOption(slot, word));
    if (curatedSlot) continue;
    const slotId = bestSlotForIngredient(builder, word);
    if (slotId) {
      if (!bySlot[slotId]) bySlot[slotId] = [];
      if (!bySlot[slotId].some(o => o.name.toLowerCase() === label.toLowerCase())) {
        bySlot[slotId].push({ name: label, note: "From your kitchen", injected: true });
      }
    } else {
      unplaced.push(label);
    }
  }
  return { bySlot, unplaced, all: labels };
}

// ---- Combo options -------------------------------------------------------------
// Some curated options bundle items meant to go together ("Bay leaves + black
// peppercorns", "Onion & garlic"). With multi-select, the cook can expand a combo
// and keep only the parts they actually have. We split ONLY on "+" and "&" — "or"
// options already mean "either one," so they stay as single choices.
//
// EXCEPTION: some "+" options describe a single blended concept whose parts are
// proportions, not independently-addable ingredients (e.g. "Half olive + half
// neutral" — a 50/50 blend, and olive/neutral are already separately selectable).
// These should NOT expand. We detect them by parts that read as fractions/shares.
function isProportionBlend(name) {
  if (!name) return false;
  return name.split(/\s[+&]\s/).every(p => /^(half|part|parts|⅓|⅔|¼|½|¾|\d|one|two|three)\b/i.test(p.trim()));
}
function isComboName(name) {
  if (!name) return false;
  if (isProportionBlend(name)) return false;
  return /\s[+&]\s/.test(name);
}
function comboParts(name) {
  if (!isComboName(name)) return [name];
  return name.split(/\s[+&]\s/).map(p => p.trim()).filter(Boolean);
}
// Capitalize the first letter of a part so it reads as a standalone label
// ("black peppercorns" → "Black peppercorns").
function partLabel(part) {
  if (!part) return part;
  return part.charAt(0).toUpperCase() + part.slice(1);
}

// "Skip …" / "None" style options are mutually exclusive with real picks in a
// multi-select slot: choosing Skip means "none of the above," and choosing any real
// option clears a previously-set Skip. Detected by a leading "skip"/"none"/"no ".
function isSkipOption(name) {
  return /^(skip|none\b|no )/i.test((name || "").trim());
}

// Collision-proof id: Date.now() alone collides when two items are created in the
// same millisecond (two quick saves, a loop, two pantry adds). Append a random
// suffix so ids are unique. (Removing one entry by id must never remove another.)
function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Which engagement prompt (if any) is earned right now — PURE so the timing/ordering
// invariants are testable. Returns "newsletter" | "review" | null.
// Rules: newsletter fires first (lower friction); review only AFTER newsletter is
// resolved (shown or signed up); each fires once; thresholds gate on activity.
function nextEarnedPrompt(engagement, daysInstalled) {
  const e = engagement || {};
  if (!e.newsletterPromptShown && !e.newsletterSignedUp) {
    const earned =
      (e.scrapbookEntries || 0) >= 1 ||
      (e.recipesBuilt || 0) >= 2 ||
      ((e.pantryAdds || 0) >= 1 && daysInstalled >= 3);
    if (earned) return "newsletter";
  }
  if (!e.reviewPromptShown && !e.reviewPromptDismissed && (e.newsletterPromptShown || e.newsletterSignedUp)) {
    const earned =
      (e.scrapbookEntries || 0) >= 2 ||
      (e.recipesBuilt || 0) >= 3 ||
      ((e.pantryAdds || 0) >= 3 && daysInstalled >= 7);
    if (earned) return "review";
  }
  return null;
}

// Email validation for the newsletter form. Stricter than "something@something.x":
// requires a local part, a domain label, and a 2+ char TLD, with no spaces.
function isValidEmail(email) {
  if (typeof email !== "string") return false;
  const e = email.trim();
  if (!e || /\s/.test(e)) return false;
  return /^[^@]+@[^@.]+(\.[^@.]+)*\.[a-z]{2,}$/i.test(e);
}

// ---- Carried-in ("From your kitchen") state — PURE, TESTABLE ---------------------
// These derive the state of a carried-in ingredient from plain data so the chip and
// the footer share ONE source of truth and can never contradict each other.
// (Extracted from the component after repeated chip/footer divergence bugs.)
//
//   picksBySlot     : { slotId: string | string[] }  — current selections
//   slots           : [{ id, label }]
//   injectedBySlot  : { slotId: [{ name }] }          — pinned/carried-in options
function normIngredientName(label) {
  return (label || "").toLowerCase().replace(/\(.*?\)/g, "").trim();
}
function pickedListFrom(picksBySlot, slotId) {
  const v = picksBySlot[slotId];
  return v == null ? [] : Array.isArray(v) ? v : [v];
}
function selectedSlotForLabel(label, picksBySlot, slots) {
  const w = normIngredientName(label);
  return slots.find(s => {
    const picked = pickedListFrom(picksBySlot, s.id);
    return picked.includes(label) || picked.some(p => w.length >= 3 && p.toLowerCase().includes(w));
  });
}
function pinnedSlotForLabel(label, slots, injectedBySlot) {
  return slots.find(s => (injectedBySlot[s.id] || []).some(o => o.name === label));
}
// One of: "selected" | "availableButOff" | "noSlot".
function carriedInState(label, picksBySlot, slots, injectedBySlot) {
  if (selectedSlotForLabel(label, picksBySlot, slots)) return "selected";
  if (pinnedSlotForLabel(label, slots, injectedBySlot)) return "availableButOff";
  return "noSlot";
}
// Build the footer, grouping carried-in ingredients BY STATE and naming them, so
// there are no pronouns to get wrong (one short line per non-empty state).
//   selected / availableButOff / noSlot are arrays of ingredient labels.
function carriedInFooter(selected, availableButOff, noSlot) {
  const lines = [];
  const list = (arr) => arr.join(", ");
  if (selected.length)
    lines.push(`${list(selected)}: in ${selected.length === 1 ? "its section" : "their sections"} below — tap to remove.`);
  if (availableButOff.length)
    lines.push(`${list(availableButOff)}: waiting in ${availableButOff.length === 1 ? "its section" : "their sections"} below — tap to use.`);
  if (noSlot.length)
    lines.push(`${list(noSlot)}: ${noSlot.length === 1 ? "no slot here" : "no slots here"} — add ${noSlot.length === 1 ? "it" : "them"} to any section with “Add another ingredient.”`);
  return lines;
}

// Recipe builder: pick a value for each slot, scale to your batch size, get a recipe card
function RecipeBuilder({ name, builder, addToScrapbook, seedScraps = [], seedIngredients = [], incModal, decModal }) {
  // Session-only injected ingredients (carried in from the meal builder / pantry).
  // Lives for the life of this mounted builder; closing the modal unmounts and resets.
  const [injections, setInjections] = useState(() => computeInjections(builder, seedScraps, seedIngredients));
  // Per-slot list of injected option objects that should appear pinned at the top.
  const [injectedBySlot, setInjectedBySlot] = useState(() => injections.bySlot);

  // Initial picks: curated matches + auto-select injected ingredients in their slots.
  const computeStartingPicks = () => {
    const base = computeInitialPicks(builder, seedScraps, seedIngredients);
    for (const [slotId, opts] of Object.entries(injections.bySlot)) {
      if (!base[slotId] && opts.length) base[slotId] = opts[0].name;
    }
    return base;
  };

  const [picks, setPicks] = useState(computeStartingPicks);
  const [scale, setScale] = useState(1);
  const [showRecipe, setShowRecipe] = useState(false);
  const [initialPickCount] = useState(() => Object.keys(computeStartingPicks()).length);
  const [saved, setSaved] = useState(false);
  const [sharingEntry, setSharingEntry] = useState(null);
  // Which slot's "+ add" picker is open, and the custom text being typed.
  const [addingToSlot, setAddingToSlot] = useState(null);
  const [customText, setCustomText] = useState("");
  // Combo handling. A combo option ("A + B") can be expanded to pick parts.
  //   expandedCombos[key]   — disclosure open?
  //   selectedParts[key]    — array of parts currently ON (source of truth for selection)
  //   wholeGroupMode[key]   — selection began as "select all" (Path A) → enables strikethrough
  //                           of dropped parts on the header. Picking parts individually
  //                           (Path B) leaves this false, so unpicked parts are just absent.
  const [expandedCombos, setExpandedCombos] = useState({});
  // Seed selectedParts/wholeGroupMode for any combo that starts already picked
  // (e.g. a curated combo auto-matched a carried-in ingredient → treat as whole group).
  const initComboState = () => {
    const sp = {}, wg = {};
    const starting = computeStartingPicks();
    for (const slot of builder.slots) {
      const v = starting[slot.id];
      const arr = v == null ? [] : Array.isArray(v) ? v : [v];
      for (const optName of arr) {
        if (isComboName(optName)) {
          const key = `${slot.id}::${optName}`;
          sp[key] = comboParts(optName);
          wg[key] = true;
        }
      }
    }
    return { sp, wg };
  };
  const [selectedParts, setSelectedParts] = useState(() => initComboState().sp);
  const [wholeGroupMode, setWholeGroupMode] = useState(() => initComboState().wg);

  const comboKey = (slotId, optName) => `${slotId}::${optName}`;
  // Wipe all combo part-state (parts, whole-group flag, disclosure) for every combo
  // option in a slot. Used when a slot is cleared or a "Skip" option takes over, so a
  // combo doesn't remember a stale partial customization next time it's selected.
  const clearComboStateForSlot = (slotId) => {
    const prefix = `${slotId}::`;
    const strip = (obj) => {
      const next = {};
      for (const k of Object.keys(obj)) if (!k.startsWith(prefix)) next[k] = obj[k];
      return next;
    };
    setSelectedParts(strip);
    setWholeGroupMode(strip);
    setExpandedCombos(strip);
  };
  const toggleCombo = (slotId, optName) =>
    setExpandedCombos(p => ({ ...p, [comboKey(slotId, optName)]: !p[comboKey(slotId, optName)] }));
  const selectedPartsFor = (slotId, optName) => selectedParts[comboKey(slotId, optName)] || [];
  const isPartOn = (slotId, optName, part) => selectedPartsFor(slotId, optName).includes(part);
  // Parts currently active, in original order.
  const activeParts = (slotId, optName) =>
    comboParts(optName).filter(p => isPartOn(slotId, optName, p));
  // Header should strike a dropped part only in whole-group mode.
  const isPartStruck = (slotId, optName, part) =>
    !!wholeGroupMode[comboKey(slotId, optName)] && !isPartOn(slotId, optName, part);

  // Select the WHOLE combo (Path A): all parts on, strikethrough enabled.
  const selectWholeCombo = (slotId, optName) => {
    const key = comboKey(slotId, optName);
    const allParts = comboParts(optName);
    const currentlyOn = selectedPartsFor(slotId, optName).length > 0;
    if (currentlyOn) {
      // Deselect entirely.
      setSelectedParts(prev => { const { [key]: _, ...rest } = prev; return rest; });
      setWholeGroupMode(prev => { const { [key]: _, ...rest } = prev; return rest; });
      setPicks(p => {
        const arr = pickedList(slotId).filter(x => x !== optName);
        if (arr.length === 0) { const { [slotId]: _, ...rest } = p; return rest; }
        return { ...p, [slotId]: arr };
      });
    } else {
      setSelectedParts(prev => ({ ...prev, [key]: [...allParts] }));
      setWholeGroupMode(prev => ({ ...prev, [key]: true }));
      setPicks(p => {
        const arr = pickedList(slotId).filter(x => !isSkipOption(x));
        if (arr.includes(optName)) return p;
        return { ...p, [slotId]: [...arr, optName] };
      });
    }
  };

  // Toggle a single PART (used inside the disclosure). Path B: if nothing was selected
  // yet, this starts an individual pick (wholeGroupMode stays false).
  const togglePart = (slotId, optName, part) => {
    const key = comboKey(slotId, optName);
    const cur = selectedPartsFor(slotId, optName);
    const next = cur.includes(part) ? cur.filter(x => x !== part) : [...cur, part];
    setSelectedParts(prev => ({ ...prev, [key]: next }));
    // Keep picks in sync: combo is "picked" iff at least one part is on.
    setPicks(p => {
      const arr = pickedList(slotId);
      if (next.length > 0 && !arr.includes(optName)) return { ...p, [slotId]: [...arr.filter(x => !isSkipOption(x)), optName] };
      if (next.length === 0 && arr.includes(optName)) {
        const left = arr.filter(x => x !== optName);
        if (left.length === 0) { const { [slotId]: _, ...rest } = p; return rest; }
        return { ...p, [slotId]: left };
      }
      return p;
    });
    // If a part-list empties, clear whole-group mode too.
    if (next.length === 0) setWholeGroupMode(prev => { const { [key]: _, ...rest } = prev; return rest; });
  };

  // Merge curated options with injected ones (injected pinned at the top) for a slot.
  const optionsForSlot = (slot) => {
    const injected = injectedBySlot[slot.id] || [];
    return [...injected, ...slot.options.filter(o => !injected.some(i => i.name.toLowerCase() === o.name.toLowerCase()))];
  };

  // Look up a chosen option across curated + injected (injected have no ratio/amount).
  const findChosen = (slot, optName) =>
    (injectedBySlot[slot.id] || []).find(o => o.name === optName) ||
    slot.options.find(o => o.name === optName);

  // Render a slot's chosen value(s) as text. Combos show their full name when ALL
  // parts are kept, or just the selected parts when some are off.
  const choiceText = (slot) =>
    pickedList(slot.id).map(optName => {
      if (!isComboName(optName)) return optName;
      const active = activeParts(slot.id, optName);
      const all = comboParts(optName);
      if (active.length === all.length) return optName; // whole combo
      return active.map(partLabel).join(" + ");
    }).join(" + ");
  // For amount display, use the first chosen option (multiples share the slot ratio).
  const choiceAmountOpt = (slot) => findChosen(slot, pickedList(slot.id)[0]);

  // Add an ingredient (from carried-in list or custom text) into a slot, pinned & selected.
  const addInjectedToSlot = (slotId, label) => {
    const clean = (label || "").trim();
    if (!clean) return;
    setInjectedBySlot(prev => {
      const cur = prev[slotId] || [];
      if (cur.some(o => o.name.toLowerCase() === clean.toLowerCase())) return prev;
      return { ...prev, [slotId]: [{ name: clean, note: "From your kitchen", injected: true }, ...cur] };
    });
    setPicks(p => ({ ...p, [slotId]: clean }));
    setAddingToSlot(null);
    setCustomText("");
  };

  // The book is about experimentation — combining is always allowed
  // (e.g. "half olive + half neutral" oil). Every slot is multi-select.
  const slotAllowsMultiple = () => true;

  // Normalize a slot's picks to an array (single slots hold a string).
  const pickedList = (slotId) => {
    const v = picks[slotId];
    if (v == null) return [];
    return Array.isArray(v) ? v : [v];
  };
  const isChosen = (slotId, name) => pickedList(slotId).includes(name);

  const allFilled = builder.slots.every(slot => pickedList(slot.id).length > 0);

  const setPick = (slotId, optionName) => {
    const slot = builder.slots.find(s => s.id === slotId);
    const multi = slot && slotAllowsMultiple(slot);
    const skip = isSkipOption(optionName);
    setPicks(p => {
      const cur = p[slotId];
      if (multi) {
        const arr = Array.isArray(cur) ? cur : cur ? [cur] : [];
        if (arr.includes(optionName)) {
          const next = arr.filter(x => x !== optionName);
          if (next.length === 0) { const { [slotId]: _, ...rest } = p; return rest; }
          return { ...p, [slotId]: next };
        }
        // Selecting "Skip" clears everything else in the slot…
        if (skip) {
          // also clear any combo part-state for this slot's options
          clearComboStateForSlot(slotId);
          return { ...p, [slotId]: [optionName] };
        }
        // …and selecting a real option drops any "Skip" that was set.
        const base = arr.filter(x => !isSkipOption(x));
        return { ...p, [slotId]: [...base, optionName] };
      }
      // single-select: tapping the same option deselects it
      if (cur === optionName) { const { [slotId]: _, ...rest } = p; return rest; }
      return { ...p, [slotId]: optionName };
    });
  };

  const formatAmount = (slot, option) => {
    if (option?.overrideAmount) {
      // Apply scale only if it contains a numeric quantity
      if (scale === 1) return option.overrideAmount;
      // Try to scale common patterns: "1 Tbsp" -> "2 Tbsp", "1 tsp" -> "2 tsp"
      const m = option.overrideAmount.match(/^(\d+(?:\/\d+)?(?:\.\d+)?)(\s+.+)$/);
      if (m) {
        const numStr = m[1];
        let num;
        if (numStr.includes("/")) {
          const [n, d] = numStr.split("/").map(Number);
          num = n / d;
        } else {
          num = parseFloat(numStr);
        }
        const scaled = num * scale;
        const rounded = scaled === Math.floor(scaled) ? scaled : Math.round(scaled * 100) / 100;
        return `${rounded}${m[2]}`;
      }
      return option.overrideAmount;
    }
    const amount = slot.ratio * scale;
    const rounded = amount === Math.floor(amount) ? amount : amount.toFixed(2);
    return `${rounded} ${slot.unit}`;
  };

  const handleSave = () => {
    if (!addToScrapbook) return;
    if (saved) return; // Already saved this exact recipe
    const ingredients = builder.slots.map(slot => {
      const opt = choiceAmountOpt(slot);
      return {
        slotLabel: slot.label,
        choice: choiceText(slot),
        amount: formatAmount(slot, opt),
      };
    });
    addToScrapbook({
      template: name,
      yieldLabel: scale === 1 ? builder.yield.label : `${scale}× ${builder.yield.label}`,
      scale,
      ingredients,
      method: builder.method,
      storage: builder.storage,
    });
    setSaved(true);
  };

  if (showRecipe && allFilled) {
    return (
      <div className="space-y-4">
        {/* Recipe card header */}
        <div className="text-center border-b-2 border-[var(--gold)] pb-4">
          <div className="text-xs uppercase tracking-widest text-[var(--accent)] mb-1">Your custom recipe</div>
          <h4 className="font-display text-2xl text-[var(--ink)]">{name}</h4>
          <div className="text-xs italic text-[var(--ink-soft)] mt-1">
            {scale === 1 ? builder.yield.label : `${scale}× ${builder.yield.label}`}
          </div>
        </div>

        {/* Ingredients */}
        <div>
          <div className="text-xs uppercase tracking-widest text-[var(--accent)] mb-3 font-bold">Ingredients</div>
          <div className="space-y-2">
            {builder.slots.map(slot => {
              const opt = choiceAmountOpt(slot);
              return (
                <div key={slot.id} className="flex items-baseline gap-3">
                  <div className="font-display text-sm text-[var(--accent)] font-semibold whitespace-nowrap">
                    {formatAmount(slot, opt)}
                  </div>
                  <div className="flex-1 text-sm text-[var(--ink)]">
                    {choiceText(slot)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Method */}
        <div>
          <div className="text-xs uppercase tracking-widest text-[var(--accent)] mb-3 font-bold">Method</div>
          <ol className="space-y-2">
            {builder.method.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-[var(--ink)]">
                <span className="font-display font-bold text-[var(--accent)] flex-shrink-0">{i + 1}.</span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Storage */}
        <div className="border-t border-dashed border-[var(--border-60)] pt-3">
          <div className="text-xs uppercase tracking-widest text-[var(--accent)] mb-1 font-bold">Storage</div>
          <p className="text-xs italic text-[var(--ink-soft)] leading-relaxed">{builder.storage}</p>
        </div>

        {/* Save confirmation banner — stays until user dismisses or navigates */}
        {saved && (
          <div
            className="border border-[var(--moss)] rounded-[3px] p-4"
            style={{ backgroundColor: "var(--surface-moss)" }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "var(--moss)" }}
              >
                <Check className="w-4 h-4 text-[var(--surface)]" strokeWidth={3} />
              </div>
              <div className="flex-1">
                <div className="font-display text-base text-[var(--ink)] font-bold mb-0.5">
                  Saved to your scrapbook
                </div>
                <p className="text-xs text-[var(--ink)] leading-relaxed">
                  Find it anytime in <span className="font-semibold">My Scrapbook</span>. You can edit, share, or delete it from there.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                // Build a preview entry to share
                const previewEntry = {
                  template: name,
                  title: name,
                  yieldLabel: scale === 1 ? builder.yield.label : `${scale}× ${builder.yield.label}`,
                  kind: "builder",
                  ingredients: builder.slots.map(slot => {
                    const opt = choiceAmountOpt(slot);
                    return {
                      slotLabel: slot.label,
                      choice: choiceText(slot),
                      amount: formatAmount(slot, opt),
                    };
                  }),
                };
                setSharingEntry(previewEntry);
              }}
              className="w-full text-xs uppercase tracking-widest border border-[var(--moss)] rounded-[3px] text-[var(--ink)] hover:bg-[var(--moss)] hover:text-[var(--surface)] py-2 font-semibold flex items-center justify-center gap-2 transition"
              style={{ backgroundColor: "transparent" }}
            >
              <Share2 className="w-3.5 h-3.5" />
              Share this recipe
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-4 border-t-2 border-[var(--gold)]">
          <button
            onClick={() => setShowRecipe(false)}
            className="px-4 py-2 text-xs uppercase tracking-widest border border-[var(--border)] rounded-[3px] text-[var(--ink)] hover:border-[var(--accent)] font-semibold"
            style={{ backgroundColor: "var(--surface)" }}
          >
            ← Edit choices
          </button>
          {addToScrapbook && (
            <button
              onClick={handleSave}
              disabled={!!saved}
              className="flex-1 px-4 py-2 text-xs uppercase tracking-widest font-semibold flex items-center justify-center gap-2 transition"
              style={{
                backgroundColor: saved ? "var(--moss)" : "var(--spark)",
                color: saved ? "var(--surface)" : "var(--on-spark)",
                cursor: saved ? "default" : "pointer",
              }}
            >
              {saved ? (
                <><Check className="w-3.5 h-3.5" strokeWidth={3} /> Saved</>
              ) : (
                <><BookMarked className="w-3.5 h-3.5" /> Save to my scrapbook</>
              )}
            </button>
          )}
        </div>
        {sharingEntry && (
          <ShareCardModal
            entry={sharingEntry}
            onClose={() => setSharingEntry(null)}
            incModal={incModal}
            decModal={decModal}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm italic text-[var(--ink-soft)] leading-relaxed">
        Pick a choice for each slot below. The book's principles are the guide; your kitchen is the lab.
      </p>

      {injections.all.length > 0 && (
        <div className="border border-[var(--moss-60)] p-3" style={{ backgroundColor: "var(--surface-moss)" }}>
          <div className="flex items-start gap-2">
            <Archive className="w-4 h-4 text-[var(--moss)] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-xs font-bold text-[var(--ink)] mb-1.5">From your kitchen</div>
              {(() => {
                // State + footer come from PURE module functions (see above), so the
                // chips and the footer can't diverge. Build a picksBySlot snapshot.
                const picksBySlot = {};
                for (const s of builder.slots) picksBySlot[s.id] = pickedList(s.id);
                const byState = { selected: [], availableButOff: [], noSlot: [] };
                for (const label of injections.all)
                  byState[carriedInState(label, picksBySlot, builder.slots, injectedBySlot)].push(label);
                const footerLines = carriedInFooter(byState.selected, byState.availableButOff, byState.noSlot);
                return (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      {injections.all.map(label => {
                        const selectedSlot = selectedSlotForLabel(label, picksBySlot, builder.slots);
                        const pinnedSlot = pinnedSlotForLabel(label, builder.slots, injectedBySlot);
                        const selected = !!selectedSlot;
                        return (
                          <span
                            key={label}
                            className="px-2 py-0.5 text-xs border"
                            style={{
                              backgroundColor: selected ? "var(--moss)" : "var(--surface)",
                              color: selected ? "var(--surface)" : "var(--ink-soft)",
                              borderColor: "var(--moss-60)",
                            }}
                          >
                            {label}
                            {selected ? ` → ${selectedSlot.label}` : pinnedSlot ? " · not used yet" : " · no slot here"}
                          </span>
                        );
                      })}
                    </div>
                    <div className="text-xs italic text-[var(--ink-soft)] mt-1.5 space-y-0.5">
                      {footerLines.map((line, i) => <div key={i}>{line}</div>)}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Batch scale */}
      <div className="flex items-center justify-between p-3 border border-[var(--border)] rounded-[3px]" style={{ backgroundColor: "var(--surface)" }}>
        <div>
          <div className="text-xs uppercase tracking-widest text-[var(--ink-soft)] mb-0.5">Batch size</div>
          <div className="text-sm text-[var(--ink)]">
            {scale === 1 ? builder.yield.label : `${scale}× the recipe`}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setScale(s => Math.max(0.5, s - 0.5))}
            disabled={scale <= 0.5}
            className="w-8 h-8 flex items-center justify-center border border-[var(--border)] rounded-[3px] text-[var(--ink)] hover:border-[var(--accent)] disabled:opacity-40"
            style={{ backgroundColor: "var(--surface)" }}
            aria-label="Decrease batch size"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <div className="w-10 text-center font-display text-base text-[var(--ink)] font-bold">
            {scale}×
          </div>
          <button
            onClick={() => setScale(s => Math.min(4, s + 0.5))}
            disabled={scale >= 4}
            className="w-8 h-8 flex items-center justify-center border border-[var(--border)] rounded-[3px] text-[var(--ink)] hover:border-[var(--accent)] disabled:opacity-40"
            style={{ backgroundColor: "var(--surface)" }}
            aria-label="Increase batch size"
          >
            <PlusIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Slots */}
      {builder.slots.map(slot => {
        const multi = slotAllowsMultiple(slot);
        return (
        <div key={slot.id}>
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <div className="text-xs uppercase tracking-widest text-[var(--accent)] font-bold">
                {slot.label}
                {multi && <span className="ml-2 text-[var(--ink-faint)] lowercase tracking-normal italic">· pick one or more</span>}
              </div>
              {slot.helpText && (
                <div className="text-xs italic text-[var(--ink-soft)] mt-0.5">{slot.helpText}</div>
              )}
            </div>
            {pickedList(slot.id).length > 0 && (
              <button
                onClick={() => { clearComboStateForSlot(slot.id); setPicks(p => { const { [slot.id]: _, ...rest } = p; return rest; }); }}
                className="text-xs text-[var(--accent)] hover:text-[var(--ink)] underline whitespace-nowrap flex-shrink-0"
              >
                clear
              </button>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-1.5">
            {optionsForSlot(slot).map(opt => {
              const isPicked = isChosen(slot.id, opt.name);
              const combo = isComboName(opt.name);
              const parts = combo ? comboParts(opt.name) : [];
              const expanded = combo && expandedCombos[comboKey(slot.id, opt.name)];
              // Caveats: for a single option, the whole name. For a combo, evaluate
              // EACH part — the warning only applies to the offending part(s), not the
              // whole pairing (apples turn to mush; parsnips & carrots don't).
              const caveat = combo ? null : textureCaveatFor(opt.name, name);
              // Per-part caveats for combos: { part: note }.
              const partCaveats = combo
                ? parts.reduce((acc, p) => { const c = textureCaveatFor(p, name); if (c) acc[p] = c; return acc; }, {})
                : {};
              // Which offending parts are currently relevant (selected, or all if not yet picked).
              const relevantParts = combo
                ? (isPicked ? parts.filter(p => isPartOn(slot.id, opt.name, p)) : parts)
                : [];
              const activeCaveatParts = relevantParts.filter(p => partCaveats[p]);

              if (!combo) {
                return (
                  <button
                    key={opt.name}
                    onClick={() => setPick(slot.id, opt.name)}
                    className="text-left p-2.5 border transition relative"
                    style={{
                      backgroundColor: isPicked ? "var(--surface-warm)" : "var(--surface)",
                      borderColor: isPicked ? "var(--spark)" : opt.injected ? "var(--moss-60)" : "var(--border)",
                    }}
                    title={isPicked ? "Tap again to deselect" : undefined}
                  >
                    {isPicked && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--spark)" }}>
                        <Check className="w-2.5 h-2.5" strokeWidth={3} style={{ color: "var(--on-spark)" }} />
                      </span>
                    )}
                    <div className="text-sm pr-6" style={{ color: "var(--ink)", fontWeight: isPicked ? 700 : 400 }}>
                      {opt.name}
                    </div>
                    <div className="text-xs italic mt-0.5" style={{ color: opt.injected ? "var(--moss)" : "var(--ink-soft)" }}>
                      {opt.injected ? "✦ From your kitchen" : opt.note}
                    </div>
                    {caveat && (
                      <div className="text-xs mt-1 flex items-start gap-1" style={{ color: "var(--spark-text)" }}>
                        <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{caveat}</span>
                      </div>
                    )}
                  </button>
                );
              }

              // Combo option: tapping the row body selects the whole group; a right-side
              // "Customize" control expands a per-part picker.
              const active = activeParts(slot.id, opt.name);
              const partial = isPicked && active.length < parts.length;
              return (
                <div
                  key={opt.name}
                  className="border transition relative"
                  style={{
                    backgroundColor: isPicked ? "var(--surface-warm)" : "var(--surface)",
                    borderColor: isPicked ? "var(--spark)" : "var(--border)",
                  }}
                >
                  <button
                    onClick={() => selectWholeCombo(slot.id, opt.name)}
                    className="w-full text-left p-2.5 relative"
                    title={isPicked ? "Tap again to deselect the whole group" : "Select the whole group"}
                  >
                    {isPicked && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--spark)" }}>
                        <Check className="w-2.5 h-2.5" strokeWidth={3} style={{ color: "var(--on-spark)" }} />
                      </span>
                    )}
                    <div className="text-sm pr-6" style={{ color: "var(--ink)", fontWeight: isPicked ? 700 : 400 }}>
                      {/* Whole-group mode with a drop → all parts, dropped ones struck (learning).
                          Individual-pick mode (Path B) → only the parts chosen.
                          Not partial → full combo name. */}
                      {!partial
                        ? opt.name
                        : wholeGroupMode[comboKey(slot.id, opt.name)]
                          ? parts.map((p, i) => (
                              <span key={p}>
                                {i > 0 && <span style={{ color: "var(--ink-faint)" }}> + </span>}
                                <span style={{
                                  textDecoration: isPartStruck(slot.id, opt.name, p) ? "line-through" : "none",
                                  color: isPartOn(slot.id, opt.name, p) ? "var(--ink)" : "var(--ink-faint)",
                                }}>{i === 0 ? partLabel(p) : p}</span>
                              </span>
                            ))
                          : active.map(partLabel).join(" + ")}
                    </div>
                    {/* The combo's descriptive note (and any mg/story attribution) only
                        describes the FULL pairing — hide it once the selection is partial. */}
                    {!partial && (
                      <div className="text-xs italic mt-0.5" style={{ color: "var(--ink-soft)" }}>{opt.note}</div>
                    )}
                    {/* Caveat on the header only when the picker is CLOSED. When open,
                        the caveat moves next to the specific part in the list below. */}
                    {!expanded && activeCaveatParts.length > 0 && (
                      <div className="text-xs mt-1 flex items-start gap-1" style={{ color: "var(--spark-text)" }}>
                        <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>
                          <span className="font-semibold">{activeCaveatParts.map(partLabel).join(", ")}:</span>{" "}
                          {partCaveats[activeCaveatParts[0]]}
                        </span>
                      </div>
                    )}
                  </button>
                  {/* Customize: small secondary control anchored bottom-right. */}
                  <div className="flex justify-end px-2.5 pb-2">
                    <button
                      onClick={() => toggleCombo(slot.id, opt.name)}
                      className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-[var(--surface-warm)]"
                      style={{ color: expanded ? "var(--spark-text)" : "var(--ink-faint)" }}
                      aria-label={expanded ? "Hide individual ingredients" : "Customize individual ingredients"}
                    >
                      <SlidersHorizontal style={{ width: "0.7rem", height: "0.7rem" }} />
                      <span style={{ fontSize: "0.55rem", letterSpacing: "0.06em" }} className="uppercase flex items-center gap-0.5">
                        Customize
                        <ChevronDown style={{ width: "0.6rem", height: "0.6rem", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }} className="transition-transform" />
                      </span>
                    </button>
                  </div>
                  {expanded && (
                    <div className="px-2.5 pb-2.5 pt-2 border-t border-dashed border-[var(--border)] space-y-1">
                      <div className="text-xs italic text-[var(--ink-soft)] mb-1">Pick the parts you have:</div>
                      {parts.map(p => {
                        const on = isPartOn(slot.id, opt.name, p);
                        return (
                          <div key={p}>
                            <button
                              onClick={() => togglePart(slot.id, opt.name, p)}
                              className="flex items-center gap-2 w-full text-left py-1"
                            >
                              <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 border" style={{ backgroundColor: on ? "var(--spark)" : "transparent", borderColor: on ? "var(--spark)" : "var(--border)" }}>
                                {on && <Check className="w-2.5 h-2.5" strokeWidth={3} style={{ color: "var(--on-spark)" }} />}
                              </span>
                              <span className="text-sm" style={{ color: on ? "var(--ink)" : "var(--ink-soft)" }}>{partLabel(p)}</span>
                            </button>
                            {partCaveats[p] && on && (
                              <div className="text-xs ml-6 mb-1 flex items-start gap-1" style={{ color: "var(--spark-text)" }}>
                                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span>{partCaveats[p]}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Add-another-ingredient affordance */}
          {addingToSlot === slot.id ? (
            (() => {
              const here = optionsForSlot(slot).map(o => o.name.toLowerCase());
              const candidates = injections.all.filter(l => {
                const w = normIngredient(l);
                if (w.length < 2) return false;
                if (here.includes(l.toLowerCase())) return false;
                // Only offer if this ingredient's role points at this slot,
                // or it shares a keyword with one of the slot's curated options.
                return bestSlotForIngredient(builder, w) === slot.id || slotHasOption(slot, w);
              });
              return (
                <div className="mt-2 p-3 border-2 border-dashed border-[var(--moss-60)]" style={{ backgroundColor: "var(--surface-moss)" }}>
                  {candidates.length > 0 && (
                    <>
                      <div className="text-xs uppercase tracking-widest text-[var(--ink-soft)] mb-1.5">From your kitchen</div>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {candidates.map(label => (
                          <button
                            key={label}
                            onClick={() => addInjectedToSlot(slot.id, label)}
                            className="px-2.5 py-1 text-xs border border-[var(--moss-60)] hover:bg-[var(--surface-warm)]"
                            style={{ color: "var(--ink)", backgroundColor: "var(--surface)" }}
                          >
                            + {label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  <div className="text-xs uppercase tracking-widest text-[var(--ink-soft)] mb-1.5">
                    {candidates.length > 0 ? "Or type your own" : "Type an ingredient"}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customText}
                      onChange={e => setCustomText(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") addInjectedToSlot(slot.id, customText); }}
                      placeholder="e.g. Leftover roast pork"
                      className="flex-1 px-3 py-2 text-sm border border-[var(--border)] rounded-[3px]"
                      style={{ backgroundColor: "var(--surface)", color: "var(--ink)" }}
                    />
                    <button
                      onClick={() => addInjectedToSlot(slot.id, customText)}
                      disabled={!customText.trim()}
                      className="px-3 py-2 text-xs uppercase tracking-widest font-bold disabled:opacity-40"
                      style={{ backgroundColor: "var(--accent)", color: "var(--surface)" }}
                    >
                      Add
                    </button>
                    <button
                      onClick={() => { setAddingToSlot(null); setCustomText(""); }}
                      className="px-3 py-2 text-xs uppercase tracking-widest text-[var(--ink-soft)] hover:text-[var(--ink)]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            })()
          ) : (
            <button
              onClick={() => { setAddingToSlot(slot.id); setCustomText(""); }}
              className="mt-2 text-xs uppercase tracking-widest text-[var(--accent)] hover:text-[var(--ink)] flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add another ingredient
            </button>
          )}
        </div>
        );
      })}

      {/* Build button */}
      <div className="pt-4 border-t-2 border-[var(--gold)]">
        <button
          onClick={() => setShowRecipe(true)}
          disabled={!allFilled}
          className="w-full px-4 py-3 text-sm uppercase tracking-widest font-bold disabled:opacity-40 flex items-center justify-center gap-2 transition"
          style={{ backgroundColor: allFilled ? "var(--spark)" : "var(--accent)", color: allFilled ? "var(--on-spark)" : "var(--surface)" }}
        >
          <Wand2 className="w-4 h-4" />
          {allFilled ? "Build my recipe" : `Pick ${builder.slots.filter(s => pickedList(s.id).length === 0).length} more`}
        </button>
      </div>
    </div>
  );
}

function SubstitutionFinder({ openDeepDive }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    const items = Object.keys(SUBSTITUTIONS);
    if (!query) return items;
    return items.filter(k => k.toLowerCase().includes(query.toLowerCase()));
  }, [query]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-2xl text-[var(--ink)] mb-1">Missing an ingredient?</h3>
        <div className="h-1 w-12 mb-2" style={{ backgroundColor: "var(--spark)" }} />
        <p className="text-sm text-[var(--ink-soft)] italic">Substitute for what the ingredient does — its role — not its name.</p>
      </div>

      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search… (lemon, butter, parmesan…)"
        className="w-full px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[3px] focus:border-[var(--accent)] outline-none text-[var(--ink)]"
      />

      <div className="grid sm:grid-cols-2 gap-2">
        {filtered.map(item => {
          const sub = SUBSTITUTIONS[item];
          const isOpen = selected === item;
          const hasDive = !!findDeepDive(item);
          return (
            <div
              key={item}
              className={`border transition ${isOpen ? "border-[var(--accent)] shadow-sm" : "border-[var(--border)]"}`}
              style={{ backgroundColor: "var(--surface)" }}
            >
              <button
                onClick={() => setSelected(isOpen ? null : item)}
                className="w-full text-left p-3 hover:bg-[var(--bg)] active:bg-[var(--bg)] transition"
                style={{ backgroundColor: isOpen ? "var(--bg)" : "var(--surface)" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-display text-lg text-[var(--ink)] ${isOpen ? "font-bold" : ""}`}>{item}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs uppercase tracking-widest whitespace-nowrap"
                      style={isOpen ? { color: "var(--surface)", backgroundColor: "var(--accent)", padding: "2px 8px" } : { color: "var(--accent)" }}
                    >
                      {sub.role}
                    </span>
                    <ChevronDown
                      className="w-4 h-4 flex-shrink-0 transition-transform text-[var(--ink-soft)]"
                      style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                    />
                  </div>
                </div>
              </button>
              {isOpen && (
                <div className="px-3 pb-3 pt-2 border-t-2 border-[var(--accent-30)]">
                  <div className="text-xs uppercase tracking-widest text-[var(--ink-soft)] mb-2">Try instead</div>
                  <ul className="space-y-1 mb-3">
                    {sub.swaps.map(s => (
                      <li key={s} className="text-sm text-[var(--ink)] flex items-start gap-2">
                        <span className="text-[var(--accent)] mt-1">◦</span>
                        <IngredientLink name={s} onOpenDeepDive={openDeepDive} className="leading-relaxed text-left" />
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs italic text-[var(--ink-soft)] border-t border-dashed border-[var(--border-60)] pt-2">{sub.note}</p>
                  {hasDive && openDeepDive && (
                    <button
                      onClick={() => openDeepDive(item)}
                      className="mt-3 text-xs uppercase tracking-widest text-[var(--accent)] hover:text-[var(--ink)] underline font-semibold"
                    >
                      Learn more about {item} →
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StorageTimer({ openDeepDive, onOpenTemplate }) {
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const categories = ["All", ...Array.from(new Set(STORAGE_GUIDE.map(s => s.category)))];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return STORAGE_GUIDE.filter(s => {
      if (filter !== "All" && s.category !== filter) return false;
      if (!q) return true;
      return (s.name && s.name.toLowerCase().includes(q)) ||
             (s.note && s.note.toLowerCase().includes(q)) ||
             (s.category && s.category.toLowerCase().includes(q));
    });
  }, [filter, query]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-2xl text-[var(--ink)] mb-1">Storage & Safety</h3>
        <div className="h-1 w-12 mb-2" style={{ backgroundColor: "var(--spark)" }} />
        <p className="text-sm text-[var(--ink-soft)] italic">When in doubt, throw it out. Knowledge tells you what should be safe; your senses tell you what is.</p>
      </div>

      {/* Temperature reference */}
      <div className="bg-[var(--surface)] border border-[var(--ink)] rounded-[3px] p-5">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-4 h-4 text-[var(--accent)]" />
          <h4 className="font-display text-lg text-[var(--ink)]">Safe Internal Temperatures</h4>
        </div>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {TEMP_GUIDE.map(t => (
            <div key={t.food} className="flex items-baseline justify-between border-b border-[var(--border-40)] py-1">
              <span className="text-[var(--ink)]">{t.food}</span>
              <span className="font-display text-[var(--accent)] font-semibold">{t.temp}</span>
            </div>
          ))}
        </div>
        <p className="text-xs italic mt-3 text-[var(--ink-soft)]">Steaks, roasts, and chops rest at least 3 minutes after cooking.</p>
      </div>

      {/* Search */}
      <SearchInput value={query} onChange={setQuery} placeholder="Search storage (parmesan, confit, freezer…)" />

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 border-b border-[var(--border-40)] pb-3">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className="px-3 py-1.5 text-xs uppercase tracking-widest transition border"
            style={{
              backgroundColor: filter === cat ? "var(--accent)" : "var(--surface)",
              color: filter === cat ? "var(--surface)" : "var(--ink)",
              borderColor: filter === cat ? "var(--accent)" : "var(--border)",
              fontWeight: filter === cat ? 700 : 600,
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Storage table */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-sm italic text-[var(--ink-soft)] text-center py-6">
            Nothing matches “{query}”{filter !== "All" ? ` in ${filter}` : ""}. Try a different word or clear the filter.
          </p>
        )}
        {filtered.map(item => {
          // Prefer an explicit dive hint; fall back to fuzzy name match.
          const dive = item.dive ? findDeepDive(item.dive) : findDeepDive(item.name);
          const diveKey = item.dive || item.name;
          return (
          <div key={item.name} className="bg-[var(--surface)] border border-[var(--border)] rounded-[3px] p-4">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="font-display text-lg text-[var(--ink)]">{item.name}</div>
              <span className="text-xs uppercase tracking-widest text-[var(--accent)] whitespace-nowrap">{item.category}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm mb-2">
              <div>
                <LocationTag location="pantry" className="text-xs uppercase tracking-widest text-[var(--ink-soft)]" />
                <div className="text-[var(--ink)]">{item.pantry || "—"}</div>
              </div>
              <div>
                <LocationTag location="fridge" className="text-xs uppercase tracking-widest text-[var(--ink-soft)]" />
                <div className="text-[var(--ink)]">{item.fridge || "—"}</div>
              </div>
              <div>
                <LocationTag location="freezer" className="text-xs uppercase tracking-widest text-[var(--ink-soft)]" />
                <div className="text-[var(--ink)]">{item.freezer || "—"}</div>
              </div>
            </div>
            {item.note && (
              <p className={`text-xs italic pt-2 border-t border-dashed border-[var(--border-60)] ${item.note.startsWith("⚠️") ? "text-[var(--accent)]" : "text-[var(--ink-soft)]"}`}>
                {item.note}
              </p>
            )}
            {(dive && openDeepDive) || (item.template && onOpenTemplate) ? (
              <div className="mt-3 flex flex-wrap items-center gap-4">
                {dive && openDeepDive && (
                  <button
                    onClick={() => openDeepDive(diveKey)}
                    className="text-xs uppercase tracking-widest text-[var(--accent)] hover:text-[var(--ink)] underline font-semibold"
                  >
                    Learn more →
                  </button>
                )}
                {item.template && onOpenTemplate && (
                  <button
                    onClick={() => onOpenTemplate(item.template)}
                    className="text-xs uppercase tracking-widest text-[var(--accent)] hover:text-[var(--ink)] underline font-semibold"
                  >
                    Try {item.template} →
                  </button>
                )}
              </div>
            ) : null}
          </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ SCRAPBOOK ============

function Scrapbook({ entries, addEntry, removeEntry, loaded, incModal, decModal, openDeepDive }) {
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [sharing, setSharing] = useState(null);
  const [query, setQuery] = useState("");

  const sortedEntries = [...entries].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  const visibleEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedEntries;
    return sortedEntries.filter(e =>
      [e.title, e.template, e.notes, e.base, e.texture, e.temperature, e.flavor]
        .filter(Boolean)
        .some(f => f.toLowerCase().includes(q))
    );
  }, [sortedEntries, query]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-2xl text-[var(--ink)] mb-1">My Scrapbook</h3>
        <div className="h-1 w-12 mb-2" style={{ backgroundColor: "var(--spark)" }} />
        <p className="text-sm text-[var(--ink-soft)] italic">The end of the book is the beginning of your own scrapbook. Save your discoveries here.</p>
      </div>

      {/* Search + Add — side by side once there's enough to search; Add alone otherwise */}
      {sortedEntries.length > 3 ? (
        <div className="flex gap-2 items-stretch">
          <div className="flex-1">
            <SearchInput value={query} onChange={setQuery} placeholder="Search saved recipes…" />
          </div>
          <button
            onClick={() => setAdding(true)}
            className="flex-shrink-0 flex items-center justify-center gap-1.5 px-4 border-2 border-dashed border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--surface)] transition font-semibold"
            style={{ backgroundColor: "transparent" }}
            aria-label="Save a discovery"
          >
            <Plus className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest">Save</span>
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--surface)] transition font-semibold"
          style={{ backgroundColor: "transparent" }}
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm uppercase tracking-widest">Save a discovery</span>
        </button>
      )}

      {/* Empty state */}
      {loaded && sortedEntries.length === 0 && (
        <div className="p-6 border border-[var(--border)] rounded-[3px] text-center" style={{ backgroundColor: "var(--surface)" }}>
          <BookMarked className="w-8 h-8 text-[var(--accent)] mx-auto mb-2 opacity-60" />
          <p className="text-sm text-[var(--ink)] mb-1">Your scrapbook is empty.</p>
          <p className="text-xs italic text-[var(--ink-soft)]">Build a recipe in the Templates tab, or save your own improvisation here.</p>
        </div>
      )}

      {!loaded && (
        <div className="p-6 text-center text-sm italic text-[var(--ink-soft)]">Loading your scrapbook…</div>
      )}

      {/* No search results */}
      {sortedEntries.length > 0 && visibleEntries.length === 0 && (
        <p className="text-sm italic text-[var(--ink-soft)] text-center py-6">
          None of your saved recipes match “{query}”.
        </p>
      )}

      {/* Entries */}
      {visibleEntries.length > 0 && (
        <div className="space-y-3">
          {visibleEntries.map(entry => (
            <div
              key={entry.id}
              className="border border-[var(--border)] rounded-[3px] hover:border-[var(--accent)] active:border-[var(--accent)] transition"
              style={{ backgroundColor: "var(--surface)" }}
            >
              <button
                onClick={() => setViewing(entry)}
                className="w-full text-left p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-lg text-[var(--ink)] truncate">
                      {entry.title || entry.template || "Untitled discovery"}
                    </div>
                    {entry.template && entry.title && (
                      <div className="text-xs italic text-[var(--ink-soft)]">based on {entry.template}</div>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--accent)] transition flex-shrink-0 mt-1" />
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="uppercase tracking-widest text-[var(--accent)]">
                    {entry.kind === "builder" ? "Built recipe" : "My discovery"}
                  </span>
                  <span className="text-[var(--ink-soft)]">{entry.savedAt}</span>
                  {entry.yieldLabel && <span className="text-[var(--ink-soft)] italic">· {entry.yieldLabel}</span>}
                </div>
                {entry.notes && (
                  <p className="text-xs italic text-[var(--ink-soft)] mt-2 line-clamp-2">"{entry.notes}"</p>
                )}
              </button>
              {/* Quick share button */}
              <div className="border-t border-[var(--border-60)] px-4 py-2 flex justify-end">
                <button
                  onClick={(e) => { e.stopPropagation(); setSharing(entry); }}
                  className="text-xs uppercase tracking-widest text-[var(--accent)] hover:text-[var(--ink)] flex items-center gap-1 font-semibold"
                >
                  <Share2 className="w-3 h-3" />
                  Share
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      {adding && (
        <ScrapbookAddModal
          onAdd={(e) => { addEntry(e); setAdding(false); }}
          onClose={() => setAdding(false)}
          incModal={incModal}
          decModal={decModal}
        />
      )}

      {/* View modal */}
      {viewing && (
        <ScrapbookEntryModal
          entry={viewing}
          onClose={() => setViewing(null)}
          onDelete={() => { removeEntry(viewing.id); setViewing(null); }}
          incModal={incModal}
          decModal={decModal}
          openShare={(e) => { setViewing(null); setSharing(e); }}
          openDeepDive={openDeepDive}
        />
      )}

      {/* Share modal */}
      {sharing && (
        <ShareCardModal
          entry={sharing}
          onClose={() => setSharing(null)}
          incModal={incModal}
          decModal={decModal}
        />
      )}
    </div>
  );
}

function ScrapbookAddModal({ onAdd, onClose, incModal, decModal }) {
  const [title, setTitle] = useState("");
  const [base, setBase] = useState("");
  const [texture, setTexture] = useState("");
  const [temperature, setTemperature] = useState("");
  const [flavor, setFlavor] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (incModal) incModal();
    return () => { if (decModal) decModal(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSave = title.trim() && (base.trim() || texture.trim() || flavor.trim());

  const handleSave = () => {
    if (!canSave) return;
    onAdd({
      kind: "discovery",
      title: title.trim(),
      base: base.trim(),
      texture: texture.trim(),
      temperature: temperature.trim(),
      flavor: flavor.trim(),
      notes: notes.trim(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-4 overflow-hidden"
      style={{ backgroundColor: "rgba(30, 36, 30, 0.82)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg border border-[var(--ink)] rounded-[3px] shadow-2xl flex flex-col max-h-screen sm:max-h-[90vh]"
        style={{ backgroundColor: "var(--surface)" }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex-shrink-0 border-b-2 border-[var(--ink)] p-4 flex items-center justify-between"
          style={{ backgroundColor: "var(--surface)" }}
        >
          <div>
            <div className="text-xs uppercase tracking-widest text-[var(--accent)]">New entry</div>
            <h3 className="font-display text-xl text-[var(--ink)]">Save a discovery</h3>
          </div>
          <button onClick={onClose} className="text-[var(--ink)] hover:text-[var(--accent)]" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ backgroundColor: "var(--surface)", overscrollBehavior: "contain" }}>
          <p className="text-xs italic text-[var(--ink-soft)] leading-relaxed">
            Use the book's framework: a meal as a base, with thoughtful texture, temperature, and flavor decisions. Fill what's relevant — skip what isn't.
          </p>

          <Field label="Title" required value={title} onChange={setTitle} placeholder="e.g. Burnt-scone crouton soup" />

          <Field
            label="The Base"
            value={base}
            onChange={setBase}
            placeholder="Leftover sausage, mystery stock, sweet potato"
            rows={2}
          />
          <Field
            label="The Texture"
            value={texture}
            onChange={setTexture}
            placeholder="Crumbled toasted scones for crunch"
            rows={2}
          />
          <Field
            label="The Temperature"
            value={temperature}
            onChange={setTemperature}
            placeholder="Hot soup with cool herb garnish"
            rows={2}
          />
          <Field
            label="The Flavor"
            value={flavor}
            onChange={setFlavor}
            placeholder="Splash of vinegar, dried thyme, fennel sausage"
            rows={2}
          />
          <Field
            label="Notes to future you"
            value={notes}
            onChange={setNotes}
            placeholder="What worked, what would you change, what to remember"
            rows={3}
          />

          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm uppercase tracking-widest border border-[var(--border)] rounded-[3px] text-[var(--ink)] hover:border-[var(--accent)]"
              style={{ backgroundColor: "var(--surface)" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="flex-1 px-4 py-2 text-sm uppercase tracking-widest font-semibold disabled:opacity-50 transition"
              style={{ backgroundColor: "var(--spark)", color: "var(--on-spark)" }}
            >
              Save to scrapbook
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, rows = 1, required = false }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-[var(--ink-soft)] mb-1.5">
        {label}
        {required && <span className="text-[var(--accent)]"> *</span>}
      </label>
      {rows > 1 ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[3px] focus:border-[var(--accent)] outline-none text-[var(--ink)] resize-none"
          style={{ backgroundColor: "var(--surface)" }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[3px] focus:border-[var(--accent)] outline-none text-[var(--ink)]"
          style={{ backgroundColor: "var(--surface)" }}
        />
      )}
    </div>
  );
}

// Reusable search box used across tabs. Mirrors the SubstitutionFinder input,
// with a clear (X) button when there's text.
// A small styled dropdown that matches the app's dark, bordered aesthetic — native
// <select> can't be styled reliably on iOS (it paints its own gray chrome). Shows
// "LABEL: <current>" with a chevron; opens a panel of options with the active one
// marked. Closes on selection or a tap outside (transparent backdrop).
// Transient bottom toast. Shows a short confirmation message; when `toast.undo` is
// present, renders an Undo button (used for destructive actions so a mis-tap is
// recoverable). Tapping anywhere on the message dismisses; Undo runs the callback.
function Toast({ toast, onUndo, onDismiss }) {
  if (!toast) return null;
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm"
      style={{ top: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}
      role="status"
      aria-live="polite"
    >
      <div
        className="flex items-center gap-3 border border-[var(--accent)] rounded-[3px] px-4 py-3 shadow-2xl"
        style={{ backgroundColor: "var(--surface)" }}
      >
        <span className="flex-1 text-sm text-[var(--ink)] min-w-0">{toast.message}</span>
        {toast.undo && (
          <button
            onClick={onUndo}
            className="flex-shrink-0 text-xs uppercase tracking-widest font-bold text-[var(--accent)] hover:text-[var(--ink)] transition"
          >
            Undo
          </button>
        )}
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-[var(--ink-soft)] hover:text-[var(--ink)] transition"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function Dropdown({ label, value, options, onChange, active = false, align = "left", icon: Icon }) {
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.value === value);
  return (
    <div className="relative flex-1 min-w-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 border px-3 py-2.5 text-xs uppercase tracking-widest font-semibold transition outline-none"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: active || open ? "var(--accent)" : "var(--border)",
          color: active ? "var(--accent)" : "var(--ink)",
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
      >
        {Icon && <Icon className="w-4 h-4 flex-shrink-0" style={{ color: "var(--accent)" }} />}
        <span className="truncate text-left min-w-0 flex-1">{current ? current.label : ""}</span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} style={{ color: "var(--accent)" }} />
      </button>
      {open && (
        <>
          {/* Transparent backdrop to capture outside taps */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute z-50 mt-1 border shadow-2xl max-h-72 overflow-y-auto"
            style={{
              backgroundColor: "var(--surface)",
              borderColor: "var(--accent)",
              ...(align === "right" ? { right: 0 } : { left: 0 }),
              minWidth: "100%",
              maxWidth: "min(20rem, calc(100vw - 2rem))",
            }}
            role="listbox"
          >
            {label && (
              <div
                className="px-3 py-2 text-[0.6rem] uppercase tracking-widest font-bold border-b"
                style={{ color: "var(--ink-soft)", borderColor: "var(--border-60)", backgroundColor: "var(--surface-alert)" }}
              >
                {label}
              </div>
            )}
            {options.map(o => {
              const isActive = o.value === value;
              return (
                <button
                  key={o.value}
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  className="w-full text-left px-3 py-2.5 text-xs uppercase tracking-widest font-semibold flex items-center justify-between gap-2 border-b last:border-b-0 transition hover:brightness-110 active:brightness-95"
                  style={{
                    borderColor: "var(--border-60)",
                    backgroundColor: isActive ? "var(--surface-alert)" : "transparent",
                    color: isActive ? "var(--accent)" : "var(--ink)",
                  }}
                  role="option"
                  aria-selected={isActive}
                >
                  <span className="truncate">{o.label}</span>
                  {isActive && <Check className="w-4 h-4 flex-shrink-0" style={{ color: "var(--accent)" }} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2 pr-9 border border-[var(--border)] rounded-[3px] focus:border-[var(--accent)] outline-none text-[var(--ink)]"
        style={{ backgroundColor: "var(--surface)" }}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] hover:text-[var(--ink)]"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ============ SUPPORT (TIP JAR + SHARE THE APP) ============

// Renders an ingredient string with each linkable ingredient as its own tappable
// deep-dive link, leaving connectors (commas, "or", "+"), parenthetical caveats
// ("(don't boil)"), and descriptor words as plain text. Links are honest — a token
// only becomes a link when findDeepDive() actually resolves it. This handles both
// "Greek yogurt (don't boil)" (link only "Greek yogurt") and "Crushed crackers,
// chips, or pretzels" (link each that has a dive, individually).
function IngredientLink({ name, onOpenDeepDive, className = "" }) {
  if (!name) return null;
  // Split into tokens while KEEPING the separators, so we can render them verbatim
  // between linked spans. Separators: commas, parens, slashes, and the words or/and/+.
  const parts = name.split(/(\s*[(),/+]\s*|\s+or\s+|\s+and\s+)/i).filter(p => p !== "" && p !== undefined);

  const renderToken = (token, i) => {
    // A separator chunk (matched the split group) — render as-is.
    if (/^(\s*[(),/+]\s*|\s+or\s+|\s+and\s+)$/i.test(token)) {
      return <span key={i}>{token}</span>;
    }
    // A content token: link it only if a deep-dive resolves AND we have a handler.
    const dive = onOpenDeepDive && findDeepDive(token);
    if (dive) {
      return (
        <button
          key={i}
          onClick={() => onOpenDeepDive(token)}
          className="underline decoration-dotted underline-offset-2 hover:decoration-solid active:opacity-70 transition text-[var(--accent)]"
          title={`Learn about ${token.trim()}`}
        >
          {token}
        </button>
      );
    }
    return <span key={i}>{token}</span>;
  };

  return <span className={className}>{parts.map(renderToken)}</span>;
}

// Build the list of linkable terms ONCE. Each term is { term, type } where type is
// "dive" (ingredient deep-dive) or "template" (a walkthrough). Sorted longest-first so
// multi-word terms ("Olive Oil", "Confit Project") win over shorter substrings.
const PROSE_LINK_TERMS = (() => {
  const map = new Map(); // lowercased term → { term, type } (first/ longest wins on ties)
  const add = (term, type) => {
    if (!term) return;
    const key = term.toLowerCase();
    if (!map.has(key)) map.set(key, { term, type });
  };
  for (const key of Object.keys(INGREDIENT_DEEP_DIVES)) {
    add(key, "dive");
    const nm = INGREDIENT_DEEP_DIVES[key].name;
    // Use the leading proper-noun part of the display name (before any "(" or "&"),
    // e.g. "Parmesan & its Rinds" → "Parmesan", "Ghee (Clarified Butter)" → "Ghee".
    if (nm) {
      const lead = nm.split(/[(&]/)[0].trim();
      if (lead) add(lead, "dive");
    }
  }
  // Full template names only (informal nicknames like "pesto"/"confit" are too common
  // in prose to link safely).
  for (const t of TEMPLATES) add(t.name, "template");
  return [...map.values()].sort((a, b) => b.term.length - a.term.length);
})();

// Some short terms are correct in isolation but wrong inside a longer phrase — most
// notably "wine" inside "wine vinegar" (that's Vinegar, not Wine). When a candidate
// term is immediately followed by one of these words, skip linking it here and let the
// later word (vinegar) match instead.
const PROSE_LINK_LOOKAHEAD_SKIP = {
  "wine": ["vinegar"],
  "rice": ["vinegar", "wine"],
  "apple": ["cider"],
};

// Renders a paragraph of prose with the FIRST occurrence of each known ingredient OR
// template name turned into a tappable link, leaving all other words untouched. Used
// for framework text, monthly tips, and other sentences where these names appear
// inline. Matching is word-boundary based and longest-term-first; ingredient matches
// are re-validated with findDeepDive (so "wine vinegar" / "almond butter" don't
// mis-link). Pass onOpenDeepDive and/or onOpenTemplate; whichever handler is missing
// disables that link type.
function LinkedProse({ text, onOpenDeepDive, onOpenTemplate, className = "" }) {
  if (!text) return null;
  if (!onOpenDeepDive && !onOpenTemplate) return <p className={className}>{text}</p>;

  const segments = [];
  const linkedKeys = new Set(); // destination key → only link first occurrence per block
  let i = 0;
  let buffer = ""; // accumulates plain text between links
  const flush = () => { if (buffer) { segments.push(buffer); buffer = ""; } };

  while (i < text.length) {
    // Only attempt a match at a word boundary (start of string or after a non-letter).
    const atBoundary = i === 0 || !/[A-Za-z]/.test(text[i - 1]);
    let matched = null;
    if (atBoundary) {
      for (const entry of PROSE_LINK_TERMS) {
        const term = entry.term;
        const end = i + term.length;
        if (end > text.length) continue;
        // Must match the term case-insensitively AND end on a word boundary.
        if (text.slice(i, end).toLowerCase() !== term.toLowerCase()) continue;
        if (end < text.length && /[A-Za-z]/.test(text[end])) continue; // not a whole word
        const surface = text.slice(i, end);

        if (entry.type === "template") {
          if (!onOpenTemplate) continue;
          if (linkedKeys.has("tpl:" + term)) continue;
          matched = { surface, type: "template", name: term, dedupe: "tpl:" + term };
          break;
        }
        // ingredient dive
        if (!onOpenDeepDive) continue;
        // Lookahead guard: skip when this short term is part of a longer phrase that
        // belongs to a different ingredient (e.g. "wine" before "vinegar").
        const skipWords = PROSE_LINK_LOOKAHEAD_SKIP[surface.toLowerCase()];
        if (skipWords) {
          const rest = text.slice(end).replace(/^\s+/, "").toLowerCase();
          if (skipWords.some(w => rest.startsWith(w))) continue;
        }
        const dive = findDeepDive(surface);
        if (!dive) continue;                            // excluded or unknown — skip
        if (linkedKeys.has("dive:" + dive.name)) continue; // already linked once
        matched = { surface, type: "dive", dive, dedupe: "dive:" + dive.name };
        break;
      }
    }
    if (matched) {
      flush();
      linkedKeys.add(matched.dedupe);
      const surface = matched.surface;
      const onClick = matched.type === "template"
        ? () => onOpenTemplate(matched.name)
        : () => onOpenDeepDive(surface);
      const title = matched.type === "template"
        ? `Open the ${surface.trim()} template`
        : `Learn about ${surface.trim()}`;
      segments.push(
        <button
          key={i}
          onClick={onClick}
          className="underline decoration-dotted underline-offset-2 hover:decoration-solid active:opacity-70 transition text-[var(--accent)]"
          title={title}
        >
          {surface}
        </button>
      );
      i += surface.length;
    } else {
      buffer += text[i];
      i += 1;
    }
  }
  flush();
  return <p className={className}>{segments}</p>;
}

function Support({ openShareApp, engagement }) {
  const [tipState, setTipState] = useState("idle"); // idle | thanks
  const reviewOk = isConfiguredLink(EXTERNAL_LINKS.amazonReview);
  const giftOk = isConfiguredLink(EXTERNAL_LINKS.amazonBook);
  const amounts = tipAmounts(EXTERNAL_LINKS.tips);

  // Compose a friendly summary of the user's engagement so the page feels personalized
  const usage = useMemo(() => {
    if (!engagement) return null;
    const items = [];
    if (engagement.scrapbookEntries) items.push(`${engagement.scrapbookEntries} saved recipe${engagement.scrapbookEntries > 1 ? "s" : ""}`);
    if (engagement.pantryAdds) items.push(`${engagement.pantryAdds} pantry item${engagement.pantryAdds > 1 ? "s" : ""}`);
    if (engagement.recipesBuilt) items.push(`${engagement.recipesBuilt} recipe${engagement.recipesBuilt > 1 ? "s" : ""} built`);
    return items.length > 0 ? items.join(" · ") : null;
  }, [engagement]);

  const handleTip = (amount) => {
    window.open(EXTERNAL_LINKS.tips[amount], "_blank", "noopener");
    setTipState("thanks");
    setTimeout(() => setTipState("idle"), 4000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-2xl text-[var(--ink)] mb-1">Support Scrap Alchemy</h3>
        <div className="h-1 w-12 mb-2" style={{ backgroundColor: "var(--spark)" }} />
        <p className="text-sm text-[var(--ink-soft)] italic">
          If this app has helped you cook with confidence, here are a few ways to give back. Just being here is support enough — anything beyond that is a generous bonus.
        </p>
      </div>

      {usage && (
        <div className="border border-[var(--border)] rounded-[3px] p-3 text-center" style={{ backgroundColor: "var(--surface)" }}>
          <div className="text-xs uppercase tracking-widest text-[var(--accent)] mb-1">Your alchemy so far</div>
          <div className="text-sm text-[var(--ink)] italic">{usage}</div>
        </div>
      )}

      {/* Three paths */}
      <div className="space-y-4">
        {/* Path 1: Leave a review — only when a real review link is configured */}
        {reviewOk && (
        <div className="border border-[var(--border)] rounded-[3px] p-5" style={{ backgroundColor: "var(--surface)" }}>
          <div className="flex items-start gap-3 mb-3">
            <div className="font-display text-3xl text-[var(--accent)] flex-shrink-0">★</div>
            <div className="flex-1">
              <h4 className="font-display text-lg text-[var(--ink)] mb-1">Leave a review</h4>
              <p className="text-xs italic text-[var(--ink-soft)]">Free. Worth more than money to a small author.</p>
            </div>
          </div>
          <p className="text-sm text-[var(--ink)] leading-relaxed mb-3">
            A one-line review on Amazon takes 30 seconds and helps other home cooks discover the book. This is the single best thing you can do.
          </p>
          <button
            onClick={() => window.open(EXTERNAL_LINKS.amazonReview, "_blank", "noopener")}
            className="w-full px-4 py-2.5 text-sm uppercase tracking-widest font-bold flex items-center justify-center gap-2 transition"
            style={{ backgroundColor: "var(--spark)", color: "var(--on-spark)" }}
          >
            ★ Review on Amazon
          </button>
        </div>
        )}

        {/* Path 2: Tip a coffee — only the amounts with configured payment links */}
        {amounts.length > 0 && (
        <div className="border border-[var(--border)] rounded-[3px] p-5" style={{ backgroundColor: "var(--surface)" }}>
          <div className="flex items-start gap-3 mb-3">
            <div className="font-display text-3xl text-[var(--accent)] flex-shrink-0">☕</div>
            <div className="flex-1">
              <h4 className="font-display text-lg text-[var(--ink)] mb-1">Tip a coffee</h4>
              <p className="text-xs italic text-[var(--ink-soft)]">Buys me an hour of writing time.</p>
            </div>
          </div>
          <p className="text-sm text-[var(--ink)] leading-relaxed mb-3">
            If the app has been useful and you'd like to support its development directly, a small tip goes a long way. No subscription, no strings.
          </p>
          {tipState === "thanks" ? (
            <div className="text-center text-sm italic text-[var(--moss)] py-3 border border-[var(--moss)] rounded-[3px]" style={{ backgroundColor: "var(--surface-moss)" }}>
              Thank you. It really does help.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {amounts.map(amount => (
                <button
                  key={amount}
                  onClick={() => handleTip(amount)}
                  className="px-3 py-2.5 text-sm uppercase tracking-widest border border-[var(--accent)] rounded-[3px] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--surface)] font-bold transition"
                  style={{ backgroundColor: "var(--surface)" }}
                >
                  ${amount}
                </button>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Path 3: Buy for a friend — only when the book's product page is configured */}
        {giftOk && (
        <div className="border border-[var(--border)] rounded-[3px] p-5" style={{ backgroundColor: "var(--surface)" }}>
          <div className="flex items-start gap-3 mb-3">
            <div className="font-display text-3xl text-[var(--accent)] flex-shrink-0">📖</div>
            <div className="flex-1">
              <h4 className="font-display text-lg text-[var(--ink)] mb-1">Gift the book</h4>
              <p className="text-xs italic text-[var(--ink-soft)]">For someone who'd love it as much as you do.</p>
            </div>
          </div>
          <p className="text-sm text-[var(--ink)] leading-relaxed mb-3">
            Know a home cook, a new homeowner, a parent figuring out family meals? The book makes a thoughtful gift — and helps the work continue.
          </p>
          <button
            onClick={() => window.open(EXTERNAL_LINKS.amazonBook, "_blank", "noopener")}
            className="w-full px-4 py-2.5 text-sm uppercase tracking-widest border border-[var(--accent)] rounded-[3px] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--surface)] font-bold flex items-center justify-center gap-2"
            style={{ backgroundColor: "var(--surface)" }}
          >
            📖 Gift on Amazon
          </button>
        </div>
        )}

        {/* Path 4 (bonus): Tell a friend */}
        {openShareApp && (
          <div className="border-2 border-dashed border-[var(--border)] p-5 text-center" style={{ backgroundColor: "transparent" }}>
            <p className="text-sm text-[var(--ink)] mb-3">
              Or just tell a friend about the app — personal recommendations matter most.
            </p>
            <button
              onClick={openShareApp}
              className="text-xs uppercase tracking-widest text-[var(--accent)] hover:text-[var(--ink)] underline font-bold flex items-center justify-center gap-1.5 w-full"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share Scrap Alchemy
            </button>
          </div>
        )}
      </div>

      <div className="text-xs italic text-[var(--ink-soft)] text-center pt-4 border-t border-dashed border-[var(--border-60)]">
        Thank you for cooking with me. — mg
      </div>
    </div>
  );
}

// ============ SHARE CARD ============

// Draws a recipe card to a canvas. Returns the canvas element ready for export.
function drawShareCard(canvas, entry) {
  const W = 1080;
  const H = 1350;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Brand palette (literal hex — Canvas can't read CSS vars). Linen-light values.
  const C = {
    cream: "#f7f5ef",
    green: "#2f3a33",   // deep sage-charcoal for primary text
    greenMid: "#5e7259",
    carrot: "#b6633f",  // terracotta spark accent
    soft: "#5a6058",    // muted green-gray for secondary text
    sage: "#7d9070",
  };

  // Background — cream
  ctx.fillStyle = C.cream;
  ctx.fillRect(0, 0, W, H);

  // Subtle radial vignette (sage + carrot warmth, very faint)
  const grad = ctx.createRadialGradient(W * 0.3, H * 0.2, 100, W * 0.5, H * 0.5, W);
  grad.addColorStop(0, "rgba(111, 125, 88, 0.07)");
  grad.addColorStop(1, "rgba(111, 125, 88, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Outer border (double-stroke alchemist style)
  ctx.strokeStyle = C.green;
  ctx.lineWidth = 4;
  ctx.strokeRect(40, 40, W - 80, H - 80);
  ctx.lineWidth = 1;
  ctx.strokeRect(56, 56, W - 112, H - 112);

  // Header strip
  const headerY = 96;
  ctx.fillStyle = C.carrot;
  ctx.font = '500 22px Georgia, "Times New Roman", serif';
  ctx.textAlign = "center";
  ctx.letterSpacing = "0.3em";
  // Manual letter spacing emulation
  drawSpacedText(ctx, "FROM SCRAP ALCHEMY", W / 2, headerY, 4);

  // Decorative divider with beaker glyph
  drawDecorativeDivider(ctx, W / 2, headerY + 36, 280);

  // Recipe title
  ctx.fillStyle = C.green;
  ctx.textAlign = "center";
  const title = entry.title || entry.template || "Untitled";
  const titleLines = wrapText(ctx, title, W - 200, 64, "Georgia, serif", "bold");
  let titleY = headerY + 110;
  ctx.font = 'bold 64px Georgia, "Times New Roman", serif';
  for (const line of titleLines) {
    ctx.fillText(line, W / 2, titleY);
    titleY += 76;
  }

  // Optional subtitle (template name when title differs)
  if (entry.template && entry.title && entry.title !== entry.template) {
    ctx.fillStyle = C.soft;
    ctx.font = 'italic 24px Georgia, serif';
    ctx.fillText(`based on ${entry.template}`, W / 2, titleY + 8);
    titleY += 40;
  }

  // Yield label
  if (entry.yieldLabel) {
    ctx.fillStyle = C.soft;
    ctx.font = 'italic 22px Georgia, serif';
    ctx.fillText(entry.yieldLabel, W / 2, titleY + 24);
    titleY += 60;
  }

  // Decorative divider
  drawDecorativeDivider(ctx, W / 2, titleY + 30, 200);

  // Body content area
  let cursorY = titleY + 90;

  if (entry.kind === "builder" && entry.ingredients) {
    // Ingredients label
    ctx.fillStyle = C.carrot;
    ctx.font = 'bold 20px Georgia, serif';
    ctx.textAlign = "center";
    drawSpacedText(ctx, "INGREDIENTS", W / 2, cursorY, 5);
    cursorY += 50;

    // Ingredients list (only render up to 8 lines, ellipsize the rest)
    const items = entry.ingredients.slice(0, 8);
    ctx.textAlign = "left";
    const leftMargin = 140;
    const amountWidth = 200;
    for (const ing of items) {
      // Amount in rust, bold display font
      ctx.fillStyle = C.carrot;
      ctx.font = 'bold 26px Georgia, serif';
      ctx.fillText(ing.amount || "", leftMargin, cursorY);

      // Ingredient name in dark serif
      ctx.fillStyle = C.green;
      ctx.font = '26px Georgia, serif';
      const nameLines = wrapText(ctx, ing.choice || "", W - leftMargin - amountWidth - 100, 26, "Georgia, serif", "");
      // Just the first line — keep it tidy
      ctx.fillText(nameLines[0] || "", leftMargin + amountWidth, cursorY);
      cursorY += 44;
    }

    if (entry.ingredients.length > 8) {
      ctx.fillStyle = C.soft;
      ctx.font = 'italic 20px Georgia, serif';
      ctx.textAlign = "center";
      ctx.fillText(`+ ${entry.ingredients.length - 8} more in the full recipe`, W / 2, cursorY + 20);
      cursorY += 50;
    }
  } else if (entry.kind === "discovery") {
    // Discovery: show base + flavor as description blocks
    const sections = [
      { label: "BASE", text: entry.base },
      { label: "FLAVOR", text: entry.flavor },
      { label: "TEXTURE", text: entry.texture },
    ].filter(s => s.text);

    ctx.textAlign = "left";
    const margin = 140;
    for (const section of sections.slice(0, 3)) {
      ctx.fillStyle = C.carrot;
      ctx.font = 'bold 18px Georgia, serif';
      drawSpacedText(ctx, section.label, margin, cursorY, 4, "left");
      cursorY += 32;
      ctx.fillStyle = C.green;
      ctx.font = '24px Georgia, serif';
      const lines = wrapText(ctx, section.text, W - margin * 2, 24, "Georgia, serif", "");
      for (const line of lines.slice(0, 2)) {
        ctx.fillText(line, margin, cursorY);
        cursorY += 32;
      }
      cursorY += 20;
    }
  }

  // Footer area
  drawDecorativeDivider(ctx, W / 2, H - 200, 240);

  ctx.fillStyle = C.green;
  ctx.font = 'italic 32px Georgia, serif';
  ctx.textAlign = "center";
  ctx.fillText("Scrap Alchemy", W / 2, H - 142);

  ctx.fillStyle = C.soft;
  ctx.font = '20px Georgia, serif';
  ctx.fillText("turn leftovers and scraps into meals worth eating", W / 2, H - 110);

  ctx.fillStyle = C.carrot;
  ctx.font = '500 18px Georgia, serif';
  drawSpacedText(ctx, "MGFRANKBOOKS.COM", W / 2, H - 78, 5);

  return canvas;
}

// Helper: text with manual letter-spacing
function drawSpacedText(ctx, text, x, y, spacing, align = "center") {
  const chars = text.split("");
  const widths = chars.map(c => ctx.measureText(c).width);
  const totalWidth = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let startX;
  if (align === "center") startX = x - totalWidth / 2;
  else if (align === "right") startX = x - totalWidth;
  else startX = x;
  let cursor = startX;
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], cursor, y);
    cursor += widths[i] + spacing;
  }
}

// Helper: text wrapping
function wrapText(ctx, text, maxWidth, fontSize, fontFamily, weight) {
  if (!text) return [""];
  ctx.font = `${weight} ${fontSize}px ${fontFamily}`;
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Helper: ornamental divider
function drawDecorativeDivider(ctx, cx, y, width) {
  const halfW = width / 2;
  // Lines
  ctx.strokeStyle = "#7d9070";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - halfW, y);
  ctx.lineTo(cx - 16, y);
  ctx.moveTo(cx + 16, y);
  ctx.lineTo(cx + halfW, y);
  ctx.stroke();
  // Center diamond
  ctx.fillStyle = "#b6633f";
  ctx.beginPath();
  ctx.moveTo(cx, y - 6);
  ctx.lineTo(cx + 6, y);
  ctx.lineTo(cx, y + 6);
  ctx.lineTo(cx - 6, y);
  ctx.closePath();
  ctx.fill();
}

function ShareCardModal({ entry, onClose, incModal, decModal }) {
  const canvasRef = useRef(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [copyState, setCopyState] = useState("idle"); // idle | copying | copied | failed
  const [downloadState, setDownloadState] = useState("idle");
  const [shareState, setShareState] = useState("idle");

  useEffect(() => {
    if (incModal) incModal();
    return () => { if (decModal) decModal(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render the card on mount
  useEffect(() => {
    if (!canvasRef.current || !entry) return;
    drawShareCard(canvasRef.current, entry);
    try {
      const url = canvasRef.current.toDataURL("image/png");
      setImageUrl(url);
    } catch (e) {
      console.error("Failed to render share card:", e);
    }
  }, [entry]);

  const handleDownload = () => {
    if (!imageUrl) return;
    setDownloadState("downloading");
    const link = document.createElement("a");
    link.href = imageUrl;
    const safeTitle = (entry.title || entry.template || "recipe").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    link.download = `scrap-alchemy-${safeTitle}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloadState("done");
    setTimeout(() => setDownloadState("idle"), 2000);
  };

  const handleCopy = async () => {
    if (!canvasRef.current) return;
    setCopyState("copying");
    try {
      // Newer browsers support clipboard API for images
      const blob = await new Promise(res => canvasRef.current.toBlob(res, "image/png"));
      if (!blob) throw new Error("Failed to create blob");
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setCopyState("copied");
        setTimeout(() => setCopyState("idle"), 2000);
      } else {
        throw new Error("Clipboard API not supported");
      }
    } catch (e) {
      console.error("Copy failed:", e);
      setCopyState("failed");
      setTimeout(() => setCopyState("idle"), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (!canvasRef.current) return;
    setShareState("sharing");
    try {
      const blob = await new Promise(res => canvasRef.current.toBlob(res, "image/png"));
      if (!blob) throw new Error("Failed to create blob");
      const file = new File([blob], `scrap-alchemy-${entry.title || "recipe"}.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: entry.title || entry.template || "A recipe from Scrap Alchemy",
          text: `${entry.title || entry.template} — from Scrap Alchemy by mg frank`,
        });
        setShareState("idle");
      } else {
        throw new Error("Native share unsupported");
      }
    } catch (e) {
      // User canceled or unsupported — fall back silently
      setShareState("idle");
    }
  };

  const hasNativeShare = typeof navigator !== "undefined" && !!navigator.share;
  const hasClipboardImage = typeof navigator !== "undefined" && !!navigator.clipboard && !!window.ClipboardItem;

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-4 overflow-hidden"
      style={{ backgroundColor: "rgba(30, 36, 30, 0.82)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md border border-[var(--ink)] rounded-[3px] shadow-2xl flex flex-col max-h-screen sm:max-h-[90vh]"
        style={{ backgroundColor: "var(--surface)" }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex-shrink-0 border-b-2 border-[var(--ink)] p-4 flex items-center justify-between gap-2"
          style={{ backgroundColor: "var(--surface)" }}
        >
          <div>
            <div className="text-xs uppercase tracking-widest text-[var(--accent)]">Share</div>
            <h3 className="font-display text-xl text-[var(--ink)]">Recipe Card</h3>
          </div>
          <button onClick={onClose} className="text-[var(--ink)] hover:text-[var(--accent)]" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ backgroundColor: "var(--surface)", overscrollBehavior: "contain" }}>
          <p className="text-xs italic text-[var(--ink-soft)] leading-relaxed text-center">
            Save, copy, or share this card on Instagram, Pinterest, or wherever you celebrate good cooking.
          </p>

          {/* Hidden canvas — used to draw the card */}
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {/* Preview */}
          <div className="border border-[var(--border)] rounded-[3px] overflow-hidden" style={{ aspectRatio: "1080 / 1350", backgroundColor: "var(--surface)" }}>
            {imageUrl ? (
              <img src={imageUrl} alt="Recipe card preview" className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-sm italic text-[var(--ink-soft)]">Rendering your card…</div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            {hasNativeShare && (
              <button
                onClick={handleNativeShare}
                disabled={!imageUrl || shareState === "sharing"}
                className="w-full px-4 py-3 text-sm uppercase tracking-widest bg-[var(--accent)] text-[var(--surface)] hover:bg-[var(--accent-deep)] font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                {shareState === "sharing" ? "Opening share…" : "Share"}
              </button>
            )}
            <button
              onClick={handleDownload}
              disabled={!imageUrl}
              className="w-full px-4 py-3 text-sm uppercase tracking-widest border border-[var(--accent)] rounded-[3px] text-[var(--accent)] hover:bg-[var(--surface)] font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: "var(--surface)" }}
            >
              {downloadState === "done" ? <><Check className="w-4 h-4" strokeWidth={3} /> Downloaded</> : <><Download className="w-4 h-4" /> Download PNG</>}
            </button>
            {hasClipboardImage && (
              <button
                onClick={handleCopy}
                disabled={!imageUrl}
                className="w-full px-4 py-2.5 text-xs uppercase tracking-widest border border-[var(--border)] rounded-[3px] text-[var(--ink)] hover:border-[var(--accent)] disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: "var(--surface)" }}
              >
                {copyState === "copied" ? <><Check className="w-3.5 h-3.5" strokeWidth={3} /> Copied to clipboard</> :
                 copyState === "failed" ? <><X className="w-3.5 h-3.5" /> Couldn't copy — try download instead</> :
                 <><Copy className="w-3.5 h-3.5" /> Copy image</>}
              </button>
            )}
          </div>

          <p className="text-xs italic text-[var(--ink-soft)] leading-relaxed text-center pt-2 border-t border-dashed border-[var(--border-60)]">
            Sharing helps other home cooks find the book. Thank you.
          </p>
        </div>
      </div>
    </div>
  );
}


function ScrapbookEntryModal({ entry, onClose, onDelete, incModal, decModal, openShare, openDeepDive }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    if (incModal) incModal();
    return () => { if (decModal) decModal(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-4 overflow-hidden"
      style={{ backgroundColor: "rgba(30, 36, 30, 0.82)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl border border-[var(--ink)] rounded-[3px] shadow-2xl flex flex-col max-h-screen sm:max-h-[90vh]"
        style={{ backgroundColor: "var(--surface)" }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex-shrink-0 border-b-2 border-[var(--ink)] p-4 sm:p-5 flex items-start justify-between gap-2"
          style={{ backgroundColor: "var(--surface)" }}
        >
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-widest text-[var(--accent)] mb-0.5">
              {entry.kind === "builder" ? "Built recipe" : "My discovery"} · {entry.savedAt}
            </div>
            <h3 className="font-display text-xl sm:text-2xl text-[var(--ink)]">
              {entry.title || entry.template}
            </h3>
            {entry.template && entry.title && (
              <div className="text-xs italic text-[var(--ink-soft)]">based on {entry.template}</div>
            )}
          </div>
          <button onClick={onClose} className="text-[var(--ink)] hover:text-[var(--accent)] flex-shrink-0 mt-1" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5" style={{ backgroundColor: "var(--surface)", overscrollBehavior: "contain" }}>
          {/* Built recipe view */}
          {entry.kind === "builder" && (
            <>
              {entry.yieldLabel && (
                <div className="text-center text-xs italic text-[var(--ink-soft)]">
                  {entry.yieldLabel}
                </div>
              )}
              <div>
                <div className="text-xs uppercase tracking-widest text-[var(--accent)] mb-3 font-bold">Ingredients</div>
                <div className="space-y-2">
                  {entry.ingredients.map((ing, i) => (
                    <div key={i} className="flex items-baseline gap-3">
                      <div className="font-display text-sm text-[var(--accent)] font-semibold whitespace-nowrap">
                        {ing.amount}
                      </div>
                      <div className="flex-1 text-sm text-[var(--ink)]">
                        <IngredientLink name={ing.choice} onOpenDeepDive={openDeepDive} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-[var(--accent)] mb-3 font-bold">Method</div>
                <ol className="space-y-2">
                  {entry.method.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm text-[var(--ink)]">
                      <span className="font-display font-bold text-[var(--accent)] flex-shrink-0">{i + 1}.</span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
              {entry.storage && (
                <div className="border-t border-dashed border-[var(--border-60)] pt-3">
                  <div className="text-xs uppercase tracking-widest text-[var(--accent)] mb-1 font-bold">Storage</div>
                  <p className="text-xs italic text-[var(--ink-soft)] leading-relaxed">{entry.storage}</p>
                </div>
              )}
            </>
          )}

          {/* Discovery view */}
          {entry.kind === "discovery" && (
            <>
              {[
                { label: "The Base", value: entry.base },
                { label: "The Texture", value: entry.texture },
                { label: "The Temperature", value: entry.temperature },
                { label: "The Flavor", value: entry.flavor },
              ].filter(s => s.value).map(section => (
                <div key={section.label} className="border-l-2 border-[var(--gold)] pl-4">
                  <div className="text-xs uppercase tracking-widest text-[var(--accent)] mb-1">{section.label}</div>
                  <p className="text-sm text-[var(--ink)] leading-relaxed">{section.value}</p>
                </div>
              ))}
              {entry.notes && (
                <div className="border-t border-dashed border-[var(--border-60)] pt-4">
                  <div className="text-xs uppercase tracking-widest text-[var(--ink-soft)] mb-1">Notes to future you</div>
                  <p className="text-sm italic text-[var(--ink)] leading-relaxed">"{entry.notes}"</p>
                </div>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t-2 border-[var(--gold)]">
            {openShare && (
              <button
                onClick={() => openShare(entry)}
                className="px-4 py-2 text-xs uppercase tracking-widest bg-[var(--accent)] text-[var(--surface)] hover:bg-[var(--accent-deep)] font-bold flex items-center gap-2"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share this recipe
              </button>
            )}
            <button
              onClick={() => { if (confirmDelete) { onDelete(); } else { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 4000); } }}
              className={`text-xs uppercase tracking-widest underline flex items-center gap-1 ml-auto transition ${confirmDelete ? "text-[var(--accent)] font-bold" : "text-[var(--ink-soft)] hover:text-[var(--accent)]"}`}
            >
              <Trash2 className="w-3 h-3" />
              {confirmDelete ? "Tap again to delete" : "Delete entry"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ DEEP DIVE MODAL ============

function DeepDiveModal({ ingredient, onClose, onBack, onOpenTemplate, onOpenDeepDive, incModal, decModal }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (incModal) incModal();
    return () => { if (decModal) decModal(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When chaining from one ingredient to another, reset scroll to the top so the
  // new content starts at its header rather than mid-page.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [ingredient && ingredient.name]);

  if (!ingredient) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-4 overflow-hidden"
      style={{ backgroundColor: "rgba(30, 36, 30, 0.82)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl border border-[var(--ink)] rounded-[3px] shadow-2xl flex flex-col max-h-screen sm:max-h-[90vh]"
        style={{ backgroundColor: "var(--surface)" }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex-shrink-0 border-b-2 border-[var(--ink)] p-4 sm:p-5"
          style={{ backgroundColor: "var(--surface)" }}
        >
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--accent)] hover:text-[var(--ink)] mb-2 -ml-1"
              aria-label="Back to previous ingredient"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-widest text-[var(--accent)] mb-0.5">{ingredient.role}</div>
              <h3 className="font-display text-xl sm:text-2xl text-[var(--ink)]">{ingredient.name}</h3>
            </div>
            <button onClick={onClose} className="text-[var(--ink)] hover:text-[var(--accent)] flex-shrink-0 mt-1" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5" style={{ backgroundColor: "var(--surface)", overscrollBehavior: "contain" }}>
          <div>
            <div className="text-xs uppercase tracking-widest text-[var(--accent)] mb-2 font-bold">What it is</div>
            <p className="text-sm text-[var(--ink)] leading-relaxed">{ingredient.whatItIs}</p>
          </div>

          <div>
            <div className="text-xs uppercase tracking-widest text-[var(--accent)] mb-2 font-bold">Where to find it</div>
            <p className="text-sm text-[var(--ink)] leading-relaxed">{ingredient.whereToFind}</p>
          </div>

          <div>
            <div className="text-xs uppercase tracking-widest text-[var(--accent)] mb-2 font-bold">How to use it</div>
            <ul className="space-y-1.5">
              {ingredient.howToUse.map((tip, i) => (
                <li key={i} className="text-sm text-[var(--ink)] flex items-start gap-2">
                  <span className="text-[var(--accent)] mt-1 flex-shrink-0">◦</span>
                  <span className="leading-relaxed">{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-xs uppercase tracking-widest text-[var(--accent)] mb-2 font-bold">How to store it</div>
            <p className="text-sm text-[var(--ink)] leading-relaxed">{ingredient.howToStore}</p>
          </div>

          {(() => {
            // Drop any substitute that resolves to the dive we're already viewing —
            // suggesting an ingredient as its own substitute (e.g. "Dry white wine"
            // inside the Wine dive, or "lime juice" inside Lime) reads as circular.
            const subs = (ingredient.substitutes || []).filter(sub => {
              const d = findDeepDive(sub);
              return !(d && d.name === ingredient.name);
            });
            if (subs.length === 0) return null;
            return (
            <div>
              <div className="text-xs uppercase tracking-widest text-[var(--accent)] mb-2 font-bold">If you don't have it</div>
              <div className="flex flex-wrap gap-1.5">
                {subs.map(sub => {
                  const subDive = findDeepDive(sub);
                  // Don't link a substitute back to the dive we're already viewing.
                  const canExplore = subDive && onOpenDeepDive && subDive.name !== ingredient.name;
                  if (!canExplore) {
                    return (
                      <span
                        key={sub}
                        className="text-xs px-2 py-1 border border-[var(--border)] rounded-[3px] text-[var(--ink)]"
                        style={{ backgroundColor: "var(--surface)" }}
                      >
                        {sub}
                      </span>
                    );
                  }
                  return (
                    <button
                      key={sub}
                      onClick={() => onOpenDeepDive(sub)}
                      className="text-xs px-2 py-1 border border-[var(--accent)] rounded-[3px] text-[var(--accent)] font-semibold inline-flex items-center gap-1 hover:bg-[var(--accent)] hover:text-[var(--surface)] active:bg-[var(--accent)] active:text-[var(--surface)] transition"
                      style={{ backgroundColor: "var(--surface)" }}
                      title={`Learn about ${sub}`}
                    >
                      {sub}
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  );
                })}
              </div>
            </div>
            );
          })()}

          {ingredient.usedIn && ingredient.usedIn.length > 0 && (
            <div className="pt-3 border-t border-dashed border-[var(--border-60)]">
              <div className="text-xs uppercase tracking-widest text-[var(--accent)] mb-2 font-bold">Featured in</div>
              <div className="flex flex-wrap gap-1.5">
                {ingredient.usedIn.map(t => (
                  <button
                    key={t}
                    onClick={() => { if (onOpenTemplate) onOpenTemplate(t); }}
                    className="text-xs px-2 py-1 border border-[var(--accent)] rounded-[3px] text-[var(--accent)] font-semibold hover:bg-[var(--accent)] hover:text-[var(--surface)] transition"
                    style={{ backgroundColor: "var(--surface)" }}
                  >
                    {t} →
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ HOME / SETTINGS ============

// The "how this works" content as a plain block (no modal shell), so it can live
// on the Home tab. The daily welcome card sits above it via HomeTab.
function HowItWorksBody({ onGoTo, showHeading = true, tabOrder = null }) {
  // The core loop, told as three steps, then a one-line gloss on each tab.
  // Each step maps to the tab it describes, so the card navigates there.
  const steps = [
    { n: "1", icon: Archive, title: "Stock your pantry", to: "pantry", body: "Save what's actually in your kitchen — a jar of pickle brine, last night's bacon fat, a bag of frozen scraps. One item is enough to start." },
    { n: "2", icon: ChefHat, title: "Build from what you have", to: "builder", body: "Tap your ingredients in the Meal Builder. The book's templates surface as you add things — you cook from what's on hand, not from a shopping list." },
    { n: "3", icon: BookMarked, title: "Save what worked", to: "scrapbook", body: "Keep the wins in your Scrapbook — a note to your future self. That's the whole practice: cook, save, repeat." },
  ];
  // The tab list, in the USER'S order (minus Home itself — you're on it). Deriving
  // from tabOrder means the guide always mirrors the real nav, including any future
  // hidden tabs, instead of a hard-coded canonical seven.
  const guideTabs = flattenTabOrder(tabOrder || defaultTabOrder()).filter(id => id !== "home");

  return (
    <div className="space-y-5">
      <div>
        {showHeading && (
          <>
            <h3 className="font-display text-2xl text-[var(--ink)] mb-1">How this works</h3>
            <div className="h-1 w-12 mb-2" style={{ backgroundColor: "var(--spark)" }} />
          </>
        )}
        <p className="text-sm text-[var(--ink-soft)] italic">
          This isn't a recipe app — it's a working kitchen. The idea is to cook with what you already have. Here's the loop:
        </p>
      </div>

      {/* The three-step loop — each card jumps to the tab it describes */}
      <div className="space-y-3">
        {steps.map(s => {
          const Icon = s.icon;
          return (
            <button
              key={s.n}
              onClick={() => onGoTo && onGoTo(s.to)}
              className="w-full text-left flex gap-3 items-start border border-[var(--border)] rounded-[3px] p-3 hover:border-[var(--accent)] hover:bg-[var(--accent-10)] transition"
              style={{ backgroundColor: "var(--surface)" }}
            >
              <div
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center font-display font-bold rounded-[3px]"
                style={{ backgroundColor: "var(--accent)", color: "var(--surface)" }}
              >
                {s.n}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Icon className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span className="font-display font-bold text-[var(--ink)]">{s.title}</span>
                </div>
                <p className="text-xs text-[var(--ink-soft)] leading-relaxed">{s.body}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* What each tab is for — tappable; each row jumps straight to that tab.
          The tab name itself is underlined so the link reads clearly. */}
      <div>
        <div className="text-xs uppercase tracking-widest text-[var(--ink-soft)] mb-2">The tabs</div>
        <div className="space-y-0.5">
          {guideTabs.map(id => {
            const Icon = TAB_ICONS[id];
            return (
              <button
                key={id}
                onClick={() => onGoTo && onGoTo(id)}
                className="w-full flex items-baseline gap-2 text-xs text-left py-1 px-1 -mx-1 rounded-[3px] hover:bg-[var(--accent-10)] transition"
              >
                {Icon && <Icon className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0 self-center" />}
                <span className="font-bold text-[var(--accent)] whitespace-nowrap" style={{ textDecoration: "underline", textUnderlineOffset: "2px" }}>{TAB_LABELS[id]}</span>
                <span className="text-[var(--ink-soft)] italic">— {TAB_NOTES[id]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-1">
        <p className="text-sm text-[var(--ink-soft)] italic mb-2">
          New here? This is the place to start:
        </p>
        <button
          onClick={() => { if (onGoTo) onGoTo("builder"); }}
          className="w-full px-4 py-3 text-sm uppercase tracking-widest bg-[var(--accent)] text-[var(--surface)] hover:bg-[var(--accent-deep)] font-bold rounded-[3px] flex items-center justify-center gap-2"
        >
          <ChefHat className="w-4 h-4" /> Build a meal
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// The Home tab — the app's front door. The daily welcome card sits on top (until
// completed or dismissed), followed by the persistent how-this-works orientation.
// The Home dashboard. It assembles from cards that each appear only when they have
// something to say: the daily welcome card, a "use soon" nudge (when items are
// aging), a "what can you make" launch into the Builder (when the pantry has
// anything), and the how-this-works orientation — which leads for a new user and
// demotes to a quiet, collapsible footer once there's real data to show.
function HomeTab({ scraps = [], scrapbook = [], engagement, dismissedItems, dismissItem, onTabChange, openDeepDive, onOpenTemplate, tabOrder = null }) {
  const enriched = useMemo(() => enrichScraps(scraps), [scraps]);
  const pantryCount = enriched.length;
  const useSoon = useMemo(
    () => enriched.filter(s => s.needsSoon || (!s.isCustom && s.sortKey < 0))
                  .sort((a, b) => a.sortKey - b.sortKey),
    [enriched]
  );
  const unlockedTemplates = useMemo(() => {
    // How many use-up templates the current pantry suggests (rough "what can you make").
    const usable = enriched.filter(s => !s.isCustom);
    return usable.length ? templatesForScraps(usable).length : 0;
  }, [enriched]);

  // "Established" once there's a pantry to talk about. New users (empty pantry) get
  // orientation up top; established users get status first, orientation demoted.
  const established = pantryCount > 0;
  const [showGuide, setShowGuide] = useState(false); // for the collapsed guide when established

  const recentSave = scrapbook && scrapbook.length ? scrapbook[0] : null;

  return (
    <div className="space-y-6">
      {/* Daily welcome card — a natural dashboard tile; shows until the series ends
          or it's dismissed. */}
      {engagement && dismissItem && (
        <TodayBanner
          engagement={engagement}
          dismissedItems={dismissedItems}
          onDismiss={dismissItem}
          onTabChange={onTabChange}
          onOpenDeepDive={openDeepDive}
          onOpenTemplate={onOpenTemplate}
        />
      )}

      {/* Use-soon card — only when something is aging or past prime. The most useful
          greeting an anti-waste app can give. */}
      {useSoon.length > 0 && (
        <button
          onClick={() => onTabChange && onTabChange("pantry")}
          className="w-full text-left border border-[var(--spark)] rounded-[3px] p-4 hover:bg-[var(--accent-10)] transition"
          style={{ backgroundColor: "var(--surface)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4" style={{ color: "var(--spark-text)" }} />
            <span className="text-xs uppercase tracking-widest font-bold" style={{ color: "var(--spark-text)" }}>
              {useSoon.length === 1 ? "1 item to use soon" : `${useSoon.length} items to use soon`}
            </span>
          </div>
          <div className="space-y-0.5">
            {useSoon.slice(0, 3).map(s => (
              <div key={s.id} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-[var(--ink)] font-semibold">{s.label || s.type}</span>
                {/* statusText comes from enrichScrap — same wording as the Pantry list,
                    so the two screens never disagree about the same item. The compact
                    slot trims any advisory clause after the em-dash ("Use soon — check
                    it before using" → "use soon"); it's a truncation of the one source,
                    not a second derivation. */}
                <span className="text-xs italic flex-shrink-0" style={{ color: s.sortKey < 0 ? "var(--accent)" : "var(--spark-text)" }}>
                  {s.statusText.split(" — ")[0].toLowerCase()}
                </span>
              </div>
            ))}
          </div>
          {useSoon.length > 3 && (
            <p className="text-xs italic text-[var(--ink-soft)] mt-1.5">+ {useSoon.length - 3} more in your pantry</p>
          )}
          <div className="flex items-center gap-1 text-xs uppercase tracking-widest font-bold text-[var(--accent)] mt-3">
            Open pantry <ArrowRight className="w-3 h-3" />
          </div>
        </button>
      )}

      {/* What can you make — only when the pantry has known ingredients. Launch ramp
          into the core loop. */}
      {established && unlockedTemplates > 0 && (
        <button
          onClick={() => onTabChange && onTabChange("builder")}
          className="w-full text-left border border-[var(--border)] rounded-[3px] p-4 hover:border-[var(--accent)] hover:bg-[var(--accent-10)] transition"
          style={{ backgroundColor: "var(--surface)" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <ChefHat className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-xs uppercase tracking-widest font-bold text-[var(--accent)]">What can you make?</span>
          </div>
          <p className="text-sm text-[var(--ink-soft)]">
            Your pantry has {pantryCount === 1 ? "an ingredient" : `${pantryCount} ingredients`} to build from.
            {unlockedTemplates > 0 && ` ${unlockedTemplates === 1 ? "1 template fits" : `${unlockedTemplates} templates fit`} what you have.`}
          </p>
          <div className="flex items-center gap-1 text-xs uppercase tracking-widest font-bold text-[var(--accent)] mt-3">
            Build a meal <ArrowRight className="w-3 h-3" />
          </div>
        </button>
      )}

      {/* Recent save — a quiet tap back into the scrapbook. */}
      {established && recentSave && (
        <button
          onClick={() => onTabChange && onTabChange("scrapbook")}
          className="w-full text-left border border-[var(--border)] rounded-[3px] p-3 hover:border-[var(--accent)] hover:bg-[var(--accent-10)] transition flex items-center gap-3"
          style={{ backgroundColor: "var(--surface)" }}
        >
          <BookMarked className="w-4 h-4 text-[var(--accent)] flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase tracking-widest text-[var(--ink-soft)]">Last saved</div>
            <div className="text-sm font-semibold text-[var(--ink)] truncate">{recentSave.title || recentSave.template || "A discovery"}</div>
          </div>
          <ArrowRight className="w-3 h-3 text-[var(--accent)] flex-shrink-0" />
        </button>
      )}

      {/* How this works — leads for new users; demotes to a collapsible section once
          there's pantry data and the dashboard has more useful things up top. */}
      {established ? (
        <div className="border-t border-dashed border-[var(--border-60)] pt-4">
          <button
            onClick={() => setShowGuide(v => !v)}
            className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-[var(--ink-soft)] hover:text-[var(--accent)]"
          >
            <ChevronDown className="w-3.5 h-3.5 transition-transform" style={{ transform: showGuide ? "rotate(180deg)" : "none" }} />
            App guide
          </button>
          {showGuide && (
            <div className="mt-4">
              <HowItWorksBody onGoTo={onTabChange} showHeading={false} tabOrder={tabOrder} />
            </div>
          )}
        </div>
      ) : (
        <HowItWorksBody onGoTo={onTabChange} tabOrder={tabOrder} />
      )}
    </div>
  );
}

function SettingsModal({ theme, setTheme, textSize, setTextSize, tabOrder, setTabOrder, startTab, setStartTab, onClose, incModal, decModal }) {
  useEffect(() => {
    if (incModal) incModal();
    return () => { if (decModal) decModal(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const themeOptions = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "Auto", icon: Monitor },
  ];
  const sizeOptions = [
    { id: "normal", label: "Normal", cls: "text-xs" },
    { id: "large", label: "Large", cls: "text-sm" },
    { id: "xlarge", label: "Largest", cls: "text-base" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: "rgba(20, 14, 10, 0.85)" }}
      onClick={onClose}
    >
      <div
        className="settings-panel w-full sm:max-w-md border border-[var(--ink)] rounded-[3px] shadow-2xl overflow-y-auto"
        style={{ backgroundColor: "var(--surface)", maxHeight: "90vh", WebkitOverflowScrolling: "touch" }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="border-b-2 border-[var(--ink)] p-4 flex items-center justify-between sticky top-0 z-10"
          style={{ backgroundColor: "var(--surface)" }}
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="font-display text-xl text-[var(--ink)]">Settings</h3>
          </div>
          <button onClick={onClose} className="text-[var(--ink)] hover:text-[var(--accent)]" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5" style={{ backgroundColor: "var(--surface)" }}>
          {/* Theme */}
          <div>
            <div className="text-xs uppercase tracking-widest text-[var(--ink-soft)] mb-2 flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5" /> Theme
            </div>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map(opt => {
                const Icon = opt.icon;
                const active = theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setTheme(opt.id)}
                    className={`flex flex-col items-center gap-1.5 py-3 border transition ${
                      active
                        ? "border-[var(--accent)] font-bold shadow-sm"
                        : "border-[var(--border)] hover:border-[var(--accent)]"
                    }`}
                    style={{
                      backgroundColor: active ? "var(--accent)" : "var(--surface)",
                      color: active ? "var(--surface)" : "var(--ink)",
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-widest">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Text size */}
          <div>
            <div className="text-xs uppercase tracking-widest text-[var(--ink-soft)] mb-2 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5" /> Text size
            </div>
            <div className="grid grid-cols-3 gap-2">
              {sizeOptions.map(opt => {
                const active = textSize === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setTextSize(opt.id)}
                    className={`settings-fixed-text py-3 px-1 border transition text-center whitespace-nowrap uppercase ${
                      active
                        ? "border-[var(--accent)] font-bold shadow-sm"
                        : "border-[var(--border)] hover:border-[var(--accent)]"
                    }`}
                    style={{
                      backgroundColor: active ? "var(--accent)" : "var(--surface)",
                      color: active ? "var(--surface)" : "var(--ink)",
                      fontSize: "0.8rem",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs italic text-[var(--ink-soft)] mt-2">
              This sample text shows the current size. Adjust until it's comfortable to read.
            </p>
          </div>

          {/* Start on — which tab the app opens to */}
          {setStartTab && (
            <div>
              <div className="text-xs uppercase tracking-widest text-[var(--ink-soft)] mb-2 flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5" /> Start on
              </div>
              <div className="grid grid-cols-2 gap-2">
                {flattenTabOrder(tabOrder).map(id => {
                  const active = startTab === id;
                  const Icon = TAB_ICONS[id];
                  return (
                    <button
                      key={id}
                      onClick={() => setStartTab(id)}
                      className={`settings-fixed-text py-2.5 px-2 border transition flex items-center justify-center gap-1.5 ${
                        active ? "border-[var(--accent)] font-bold shadow-sm" : "border-[var(--border)] hover:border-[var(--accent)]"
                      }`}
                      style={{
                        backgroundColor: active ? "var(--accent)" : "var(--surface)",
                        color: active ? "var(--surface)" : "var(--ink)",
                        fontSize: "0.8rem",
                      }}
                    >
                      {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: active ? "var(--surface)" : "var(--accent)" }} />}
                      {TAB_LABELS[id] || id}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs italic text-[var(--ink-soft)] mt-2">
                The tab the app opens to each time.
              </p>
            </div>
          )}

          {/* Tab order — reorder groups, and tabs within each group. Home stays
              first and Support last; everything between is yours to arrange. */}
          {setTabOrder && (
            <div>
              <div className="text-xs uppercase tracking-widest text-[var(--ink-soft)] mb-2 flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5" /> Tab order
              </div>
              <div className="space-y-3">
                {tabOrder.map((g, gi) => {
                  const gMeta = TAB_GROUPS.find(x => x.id === g.id) || {};
                  const pinned = !!gMeta.pinned;
                  const [lo, hi] = movableRange(tabOrder);
                  const canGroupUp = !pinned && gi > lo;
                  const canGroupDown = !pinned && gi < hi;
                  return (
                    <div key={g.id} className="border border-[var(--border)] rounded-[3px] p-2.5" style={{ backgroundColor: "var(--surface)" }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs uppercase tracking-widest font-bold text-[var(--ink-soft)]">
                          {gMeta.label || g.id}{pinned ? " · pinned" : ""}
                        </span>
                        {!pinned && (
                          <span className="flex items-center gap-1">
                            <button
                              onClick={() => setTabOrder(moveGroup(tabOrder, g.id, -1))}
                              disabled={!canGroupUp}
                              className="w-7 h-7 flex items-center justify-center border border-[var(--border)] rounded-[3px] disabled:opacity-30 hover:border-[var(--accent)] text-[var(--accent)]"
                              aria-label={`Move ${gMeta.label} group up`}
                            >
                              <ChevronLeft className="w-3.5 h-3.5" style={{ transform: "rotate(90deg)" }} />
                            </button>
                            <button
                              onClick={() => setTabOrder(moveGroup(tabOrder, g.id, 1))}
                              disabled={!canGroupDown}
                              className="w-7 h-7 flex items-center justify-center border border-[var(--border)] rounded-[3px] disabled:opacity-30 hover:border-[var(--accent)] text-[var(--accent)]"
                              aria-label={`Move ${gMeta.label} group down`}
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {g.tabs.map((tid, ti) => {
                          const TIcon = TAB_ICONS[tid];
                          return (
                          <div key={tid} className="flex items-center justify-between pl-1">
                            <span className="settings-fixed-text text-[var(--ink)] flex items-center gap-1.5" style={{ fontSize: "0.8rem" }}>
                              {TIcon && <TIcon className="w-3.5 h-3.5 flex-shrink-0 text-[var(--accent)]" />}
                              {TAB_LABELS[tid] || tid}
                            </span>
                            {g.tabs.length > 1 && (
                              <span className="flex items-center gap-1">
                                <button
                                  onClick={() => setTabOrder(moveTabInGroup(tabOrder, g.id, tid, -1))}
                                  disabled={ti === 0}
                                  className="w-6 h-6 flex items-center justify-center border border-[var(--border)] rounded-[3px] disabled:opacity-30 hover:border-[var(--accent)] text-[var(--accent)]"
                                  aria-label={`Move ${TAB_LABELS[tid]} up`}
                                >
                                  <ChevronLeft className="w-3 h-3" style={{ transform: "rotate(90deg)" }} />
                                </button>
                                <button
                                  onClick={() => setTabOrder(moveTabInGroup(tabOrder, g.id, tid, 1))}
                                  disabled={ti === g.tabs.length - 1}
                                  className="w-6 h-6 flex items-center justify-center border border-[var(--border)] rounded-[3px] disabled:opacity-30 hover:border-[var(--accent)] text-[var(--accent)]"
                                  aria-label={`Move ${TAB_LABELS[tid]} down`}
                                >
                                  <ChevronDown className="w-3 h-3" />
                                </button>
                              </span>
                            )}
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => setTabOrder(defaultTabOrder())}
                className="text-xs uppercase tracking-widest text-[var(--ink-soft)] hover:text-[var(--accent)] underline mt-3"
              >
                Reset to default order
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ SHARE THE APP ============

function ShareAppModal({ onClose, incModal, decModal }) {
  const [copyState, setCopyState] = useState("idle");

  useEffect(() => {
    if (incModal) incModal();
    return () => { if (decModal) decModal(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const APP_URL = EXTERNAL_LINKS.appUrl;
  const SHARE_TEXT = `I've been using this kitchen app from a great cookbook — Scrap Alchemy by mg frank. It teaches you how to cook from what you have. Thought you'd like it: ${APP_URL}`;

  const handleNativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: "Scrap Alchemy",
        text: SHARE_TEXT,
        url: APP_URL,
      });
    } catch (e) {
      // User canceled or unsupported
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_TEXT);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch (e) {
      setCopyState("failed");
      setTimeout(() => setCopyState("idle"), 2000);
    }
  };

  const handleEmail = () => {
    const subject = encodeURIComponent("Thought you'd like this");
    const body = encodeURIComponent(SHARE_TEXT);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleSMS = () => {
    const body = encodeURIComponent(SHARE_TEXT);
    window.location.href = `sms:?body=${body}`;
  };

  const hasNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-4 overflow-hidden"
      style={{ backgroundColor: "rgba(30, 36, 30, 0.82)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md border border-[var(--ink)] rounded-[3px] shadow-2xl flex flex-col max-h-screen sm:max-h-[90vh]"
        style={{ backgroundColor: "var(--surface)" }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex-shrink-0 border-b-2 border-[var(--ink)] p-4 flex items-center justify-between"
          style={{ backgroundColor: "var(--surface)" }}
        >
          <div>
            <div className="text-xs uppercase tracking-widest text-[var(--accent)]">Share the app</div>
            <h3 className="font-display text-xl text-[var(--ink)]">Tell a friend</h3>
          </div>
          <button onClick={onClose} className="text-[var(--ink)] hover:text-[var(--accent)]" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ backgroundColor: "var(--surface)", overscrollBehavior: "contain" }}>
          <p className="text-sm italic text-[var(--ink-soft)] leading-relaxed text-center">
            Personal recommendations bring in better readers than any ad. Pick how to share.
          </p>

          {/* Preview of the message */}
          <div className="border border-[var(--border)] rounded-[3px] p-3 text-xs text-[var(--ink)] italic leading-relaxed" style={{ backgroundColor: "var(--surface-warm)" }}>
            "{SHARE_TEXT}"
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {hasNativeShare && (
              <button
                onClick={handleNativeShare}
                className="w-full px-4 py-3 text-sm uppercase tracking-widest bg-[var(--accent)] text-[var(--surface)] hover:bg-[var(--accent-deep)] font-bold flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share via…
              </button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleSMS}
                className="px-3 py-2.5 text-xs uppercase tracking-widest border border-[var(--border)] rounded-[3px] text-[var(--ink)] hover:border-[var(--accent)] font-semibold"
                style={{ backgroundColor: "var(--surface)" }}
              >
                Text
              </button>
              <button
                onClick={handleEmail}
                className="px-3 py-2.5 text-xs uppercase tracking-widest border border-[var(--border)] rounded-[3px] text-[var(--ink)] hover:border-[var(--accent)] font-semibold"
                style={{ backgroundColor: "var(--surface)" }}
              >
                Email
              </button>
            </div>
            <button
              onClick={handleCopyLink}
              className="w-full px-4 py-2.5 text-xs uppercase tracking-widest border border-[var(--border)] rounded-[3px] text-[var(--ink)] hover:border-[var(--accent)] flex items-center justify-center gap-2"
              style={{ backgroundColor: "var(--surface)" }}
            >
              {copyState === "copied" ? <><Check className="w-3.5 h-3.5" strokeWidth={3} /> Copied to clipboard</> :
               copyState === "failed" ? <><X className="w-3.5 h-3.5" /> Couldn't copy</> :
               <><Copy className="w-3.5 h-3.5" /> Copy message + link</>}
            </button>
          </div>

          <p className="text-xs italic text-[var(--ink-soft)] leading-relaxed text-center pt-2 border-t border-dashed border-[var(--border-60)]">
            Thank you for spreading the word.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============ MARKETING PROMPTS ============

// Soft prompt that appears at engagement milestones for review/newsletter
function EngagementPrompt({ kind, onDismiss, onAct }) {
  if (!kind) return null;

  const config = kind === "review" ? {
    icon: "★",
    title: "Enjoying Scrap Alchemy?",
    body: "If this app has helped you cook with confidence, a one-line review on Amazon helps other home cooks discover the book. It takes 30 seconds and means the world to a small author.",
    actLabel: "Leave a review",
    secondaryLabel: "Maybe later",
  } : {
    icon: "✉",
    title: "One template a month, free",
    body: "Join the newsletter to get one new template, story, or kitchen experiment per month. No spam, ever. Unsubscribe anytime.",
    actLabel: "Sign me up",
    secondaryLabel: "Not now",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      style={{ backgroundColor: "rgba(30, 36, 30, 0.82)" }}
      onClick={onDismiss}
    >
      <div
        className="w-full sm:max-w-md border border-[var(--ink)] rounded-[3px] shadow-2xl"
        style={{ backgroundColor: "var(--surface)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 sm:p-6">
          <div className="text-center mb-4">
            <div className="font-display text-3xl text-[var(--accent)] mb-1">{config.icon}</div>
            <h3 className="font-display text-xl text-[var(--ink)]">{config.title}</h3>
          </div>
          <p className="text-sm text-[var(--ink)] leading-relaxed mb-5 italic text-center">
            {config.body}
          </p>

          {kind === "newsletter" && (
            <NewsletterForm onComplete={onAct} />
          )}

          {kind === "review" && (
            <div className="flex flex-col gap-2">
              <button
                onClick={onAct}
                className="w-full px-4 py-2.5 text-sm uppercase tracking-widest font-bold transition"
                style={{ backgroundColor: "var(--spark)", color: "var(--on-spark)" }}
              >
                {config.actLabel}
              </button>
              <button
                onClick={onDismiss}
                className="w-full px-4 py-2 text-xs uppercase tracking-widest text-[var(--ink-soft)] hover:text-[var(--ink)]"
              >
                {config.secondaryLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NewsletterForm({ onComplete }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isValid = isValidEmail(email);

  const handleSubmit = async () => {
    if (!isValid || busy) return;
    setBusy(true);
    setError("");
    const clean = email.trim().toLowerCase();

    // ───────────────────────────────────────────────────────────────────────
    // NEWSLETTER SERVICE HOOK — wire this up before launch.
    // Replace the body of this block with a POST to your provider (Buttondown,
    // ConvertKit, etc.). Example for Buttondown:
    //
    //   const res = await fetch("https://api.buttondown.email/v1/subscribers", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json",
    //                "Authorization": `Token ${YOUR_BUTTONDOWN_TOKEN}` },
    //     body: JSON.stringify({ email: clean }),
    //   });
    //   if (!res.ok && res.status !== 409) throw new Error("subscribe failed");
    //   // (409 = already subscribed; treat as success)
    //
    // Until that's wired, we save locally as a fallback so nothing is lost — but
    // note these live only on the user's device and are NOT retrievable by you.
    // ───────────────────────────────────────────────────────────────────────
    try {
      if (typeof window !== "undefined" && window.storage) {
        // Dedupe: don't store the same address twice.
        let already = false;
        try {
          const existing = await window.storage.list("newsletter:");
          if (existing && existing.keys) {
            for (const k of existing.keys) {
              const rec = await window.storage.get(k);
              if (rec && JSON.parse(rec.value).email === clean) { already = true; break; }
            }
          }
        } catch (_) { /* list/get may be unavailable; fall through to write */ }
        if (!already) {
          const res = await window.storage.set(`newsletter:${Date.now()}`, JSON.stringify({ email: clean, signedUpAt: new Date().toISOString() }));
          if (!res) throw new Error("storage write failed");
        }
      }
      setSubmitted(true);
      setTimeout(() => onComplete && onComplete(), 1500);
    } catch (e) {
      console.error("Newsletter signup failed:", e);
      setError("Something went wrong saving that — please try again.");
      setBusy(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-2">
        <div className="text-[var(--moss)] mb-1">
          <Check className="w-6 h-6 mx-auto" />
        </div>
        <p className="text-sm font-display text-[var(--ink)]">Welcome to the newsletter!</p>
        <p className="text-xs italic text-[var(--ink-soft)] mt-1">First template arrives in your inbox soon.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="email"
        value={email}
        onChange={e => { setEmail(e.target.value); if (error) setError(""); }}
        placeholder="your@email.com"
        className="w-full px-3 py-2.5 text-sm border border-[var(--border)] rounded-[3px] focus:border-[var(--accent)] outline-none text-[var(--ink)]"
        style={{ backgroundColor: "var(--surface)" }}
        onKeyDown={e => e.key === "Enter" && handleSubmit()}
      />
      {error && <p className="text-xs text-[var(--spark-text)]">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={!isValid || busy}
        className="w-full px-4 py-2.5 text-sm uppercase tracking-widest bg-[var(--accent)] text-[var(--surface)] hover:bg-[var(--accent-deep)] font-bold disabled:opacity-40"
      >
        {busy ? "Signing up…" : "Sign me up"}
      </button>
      <button
        onClick={onComplete}
        className="w-full px-4 py-1.5 text-xs uppercase tracking-widest text-[var(--ink-soft)] hover:text-[var(--ink)]"
      >
        Not now
      </button>
    </div>
  );
}

// ============ MAIN APP ============

export default function App() {
  const [tab, setTab] = useState("builder");
  // Tab-row scroll affordance: on a phone the scrolling tabs overflow horizontally.
  // Track whether there's hidden content on either edge so we can show a fade
  // hint ("there's more this way") that honestly disappears at the ends and on
  // wide screens where everything fits.
  const tabScrollRef = useRef(null);
  const tabBtnRefs = useRef({}); // id -> button el, for scrolling the active tab into view
  const [tabOverflow, setTabOverflow] = useState({ left: false, right: false });
  const updateTabOverflow = () => {
    const el = tabScrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const x = el.scrollLeft;
    const next = { left: x > 1, right: x < maxScroll - 1 };
    // Only set state when something actually changed, so a scroll doesn't trigger
    // a render storm.
    setTabOverflow(prev => (prev.left === next.left && prev.right === next.right) ? prev : next);
  };
  useEffect(() => {
    updateTabOverflow();
    window.addEventListener("resize", updateTabOverflow);
    return () => window.removeEventListener("resize", updateTabOverflow);
  }, []);
  // Scroll the active tab into view ONLY when the tab actually changes — and only
  // horizontally within the tab row. scrollIntoView() would also walk page-level
  // scroll ancestors and jump the whole page, so we compute and set scrollLeft by hand.
  const tabFirstRun = useRef(true);
  useEffect(() => {
    const el = tabScrollRef.current;
    const btn = tabBtnRefs.current[tab];
    if (el && btn) {
      const btnLeft = btn.offsetLeft;
      const btnRight = btnLeft + btn.offsetWidth;
      const viewLeft = el.scrollLeft;
      const viewRight = viewLeft + el.clientWidth;
      if (btnLeft < viewLeft) {
        el.scrollTo({ left: btnLeft - 12, behavior: "smooth" });
      } else if (btnRight > viewRight) {
        el.scrollTo({ left: btnRight - el.clientWidth + 12, behavior: "smooth" });
      }
    }
    updateTabOverflow();
    // On a real tab change, start the new tab at the top of the page. Switching tabs
    // swaps in fresh (often taller) content, and without this the page keeps the prior
    // scroll position and lands you mid-content (e.g. footer → Support). Skip on first
    // mount so we don't fight a fresh load or a restored position.
    if (tabFirstRun.current) {
      tabFirstRun.current = false;
    } else {
      window.scrollTo(0, 0);
    }
  }, [tab]);
  const [scraps, setScraps] = useState([]);
  const [scrapsLoaded, setScrapsLoaded] = useState(false);
  // Transient toast: { id, message, undo? } — undo is an optional callback for
  // destructive actions (delete / toss) so a mis-tap doesn't lose saved data.
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const [scrapbook, setScrapbook] = useState([]);
  const [scrapbookLoaded, setScrapbookLoaded] = useState(false);
  // Dismissed welcome / monthly items
  const [dismissedItems, setDismissedItems] = useState([]);
  const [dismissedLoaded, setDismissedLoaded] = useState(false);
  // Share-the-app modal
  const [shareAppOpen, setShareAppOpen] = useState(false);
  // Settings modal
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Appearance preferences
  const [theme, setTheme] = useState("system"); // 'light' | 'dark' | 'system' (Auto)
  const [textSize, setTextSize] = useState("normal"); // 'normal' | 'large' | 'xlarge'
  const [systemDark, setSystemDark] = useState(false);
  const [appearanceLoaded, setAppearanceLoaded] = useState(false);

  // Detect system dark mode preference
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const handler = (e) => setSystemDark(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  // Load appearance preferences
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await window.storage.get("appearance:prefs");
        if (!cancelled && result) {
          const parsed = JSON.parse(result.value);
          if (parsed.theme) setTheme(parsed.theme === "dusk" ? "dark" : parsed.theme);
          if (parsed.textSize) setTextSize(parsed.textSize);
        }
      } catch (e) {
        // defaults
      } finally {
        if (!cancelled) setAppearanceLoaded(true);
      }
    }
    if (typeof window !== "undefined" && window.storage) {
      load();
    } else {
      setAppearanceLoaded(true);
    }
    return () => { cancelled = true; };
  }, []);

  // Persist appearance
  useEffect(() => {
    if (!appearanceLoaded) return;
    if (typeof window === "undefined" || !window.storage) return;
    window.storage.set("appearance:prefs", JSON.stringify({ theme, textSize })).catch(() => {});
  }, [theme, textSize, appearanceLoaded]);

  const resolvedTheme = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  // Engagement tracking — drives review and newsletter prompts
  const [engagement, setEngagement] = useState({
    firstOpenAt: null,
    builderUses: 0,
    recipesBuilt: 0,
    scrapbookEntries: 0,
    pantryAdds: 0,
    reviewPromptShown: false,
    reviewPromptDismissed: false,
    newsletterPromptShown: false,
    newsletterSignedUp: false,
  });
  const [engagementLoaded, setEngagementLoaded] = useState(false);
  // User-customizable tab order (grouped) + which tab the app opens to.
  const [tabOrder, setTabOrder] = useState(defaultTabOrder());
  const [startTab, setStartTab] = useState("home");
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [activePrompt, setActivePrompt] = useState(null); // 'review' | 'newsletter' | null
  const [pendingPrompt, setPendingPrompt] = useState(null); // queued, waiting for modals to close
  // Session flag — once a prompt has appeared in this session, no more prompts fire
  // until the user closes and reopens the app. Prevents stacked nagging.
  const [promptShownThisSession, setPromptShownThisSession] = useState(false);
  // Modal counter — when > 0, no prompts will fire (avoids stacking on top of modals)
  const [modalDepth, setModalDepth] = useState(0);
  const incModal = () => setModalDepth(d => d + 1);
  const decModal = () => setModalDepth(d => Math.max(0, d - 1));

  // While any modal is open, lock the page behind it so the background can't scroll
  // (and a modal's scroll can't "chain" out to the page). Crucially, we preserve the
  // scroll position: plain `overflow:hidden` makes mobile browsers jump to the top on
  // release, which is disorienting. Instead we pin the body with position:fixed at a
  // negative offset, then restore the exact scroll position when the last modal closes.
  const scrollLockY = useRef(0);
  useEffect(() => {
    if (modalDepth > 0) {
      // Only capture/lock when transitioning from 0 → >0 (body not yet fixed).
      if (document.body.style.position !== "fixed") {
        scrollLockY.current = window.scrollY || window.pageYOffset || 0;
        const body = document.body;
        body.style.position = "fixed";
        body.style.top = `-${scrollLockY.current}px`;
        body.style.left = "0";
        body.style.right = "0";
        body.style.width = "100%";
        body.style.overflow = "hidden";
      }
    } else {
      // Last modal closed — release the lock and restore the scroll position.
      if (document.body.style.position === "fixed") {
        const body = document.body;
        body.style.position = "";
        body.style.top = "";
        body.style.left = "";
        body.style.right = "";
        body.style.width = "";
        body.style.overflow = "";
        window.scrollTo(0, scrollLockY.current);
      }
    }
  }, [modalDepth]);

  // Load engagement state on mount, set firstOpenAt if first time
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await window.storage.get("engagement:state");
        if (!cancelled && result) {
          const parsed = JSON.parse(result.value);
          setEngagement(prev => ({ ...prev, ...parsed }));
        } else if (!cancelled) {
          // First time
          setEngagement(prev => ({ ...prev, firstOpenAt: new Date().toISOString() }));
        }
      } catch (e) {
        // First time
        if (!cancelled) {
          setEngagement(prev => ({ ...prev, firstOpenAt: new Date().toISOString() }));
        }
      } finally {
        if (!cancelled) setEngagementLoaded(true);
      }
    }
    if (typeof window !== "undefined" && window.storage) {
      load();
    } else {
      setEngagementLoaded(true);
    }
    return () => { cancelled = true; };
  }, []);

  // Persist engagement
  useEffect(() => {
    if (!engagementLoaded) return;
    if (typeof window === "undefined" || !window.storage) return;
    window.storage.set("engagement:state", JSON.stringify(engagement)).catch(() => {});
  }, [engagement, engagementLoaded]);

  // Load tab-order + start-tab prefs on mount. On first load, jump to the chosen
  // start tab. A corrupt/stale saved order falls back to the default.
  const prefsAppliedStart = useRef(false);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await window.storage.get("prefs:tabs");
        if (!cancelled && result) {
          const parsed = JSON.parse(result.value);
          if (parsed.tabOrder && isValidTabOrder(parsed.tabOrder)) {
            setTabOrder(parsed.tabOrder);
          }
          const validStart = parsed.startTab && flattenTabOrder(parsed.tabOrder && isValidTabOrder(parsed.tabOrder) ? parsed.tabOrder : defaultTabOrder()).includes(parsed.startTab);
          if (validStart) setStartTab(parsed.startTab);
        }
      } catch (e) {
        /* first time / unavailable — defaults stand */
      } finally {
        if (!cancelled) setPrefsLoaded(true);
      }
    }
    if (typeof window !== "undefined" && window.storage) {
      load();
    } else {
      setPrefsLoaded(true);
    }
    return () => { cancelled = true; };
  }, []);

  // Once prefs are loaded, open on the chosen start tab (first time only, so we
  // don't yank the user back when they later change the setting mid-session).
  useEffect(() => {
    if (!prefsLoaded || prefsAppliedStart.current) return;
    prefsAppliedStart.current = true;
    if (startTab && startTab !== tab) setTab(startTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefsLoaded, startTab]);

  // Persist tab prefs whenever they change (after initial load).
  useEffect(() => {
    if (!prefsLoaded) return;
    if (typeof window === "undefined" || !window.storage) return;
    window.storage.set("prefs:tabs", JSON.stringify({ tabOrder, startTab })).catch(() => {});
  }, [tabOrder, startTab, prefsLoaded]);

  const bumpEngagement = (field, amount = 1) => {
    setEngagement(prev => ({ ...prev, [field]: (prev[field] || 0) + amount }));
  };

  // Check for prompt triggers when engagement updates — sets a pending prompt.
  // The decision lives in the pure nextEarnedPrompt() so it's unit-tested.
  useEffect(() => {
    if (!engagementLoaded) return;
    if (activePrompt || pendingPrompt) return; // Don't queue if one is already pending or active
    if (promptShownThisSession) return; // One prompt per session, max

    const daysInstalled = engagement.firstOpenAt
      ? (Date.now() - new Date(engagement.firstOpenAt).getTime()) / 86400000
      : 0;

    const earned = nextEarnedPrompt(engagement, daysInstalled);
    // The review prompt has nowhere to send people until the real review link is
    // configured — hold it (the earn conditions persist, so it fires once it is).
    if (earned === "review" && !isConfiguredLink(EXTERNAL_LINKS.amazonReview)) return;
    if (earned) setPendingPrompt(earned);
  }, [engagement, engagementLoaded, activePrompt, pendingPrompt, promptShownThisSession]);

  // Promote pending prompt to active when no modals are open
  useEffect(() => {
    if (!pendingPrompt) return;
    if (activePrompt) return;
    if (modalDepth > 0) return; // Wait for modals to close
    if (promptShownThisSession) {
      setPendingPrompt(null);
      return;
    }
    // 1.5s buffer after modals close so user can read what they were doing
    const t = setTimeout(() => {
      setActivePrompt(pendingPrompt);
      setPendingPrompt(null);
    }, 1500);
    return () => clearTimeout(t);
  }, [pendingPrompt, activePrompt, modalDepth, promptShownThisSession]);

  const dismissPrompt = (action) => {
    if (activePrompt === "review") {
      if (action === "act") {
        window.open(EXTERNAL_LINKS.amazonReview, "_blank");
      }
      setEngagement(prev => ({
        ...prev,
        reviewPromptShown: true,
        reviewPromptDismissed: action === "dismiss",
      }));
    } else if (activePrompt === "newsletter") {
      setEngagement(prev => ({
        ...prev,
        newsletterPromptShown: true,
        newsletterSignedUp: action === "act",
      }));
    }
    setActivePrompt(null);
    setPromptShownThisSession(true); // Lock this session — no more prompts until next launch
  };

  // Load scraps once on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await window.storage.get("scraps:list");
        if (!cancelled && result) {
          setScraps(JSON.parse(result.value));
        }
      } catch (e) {
        // No saved data yet — that's fine
      } finally {
        if (!cancelled) setScrapsLoaded(true);
      }
    }
    if (typeof window !== "undefined" && window.storage) {
      load();
    } else {
      setScrapsLoaded(true);
    }
    return () => { cancelled = true; };
  }, []);

  // Load scrapbook once on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await window.storage.get("scrapbook:list");
        if (!cancelled && result) {
          setScrapbook(JSON.parse(result.value));
        }
      } catch (e) {
        // No saved data yet
      } finally {
        if (!cancelled) setScrapbookLoaded(true);
      }
    }
    if (typeof window !== "undefined" && window.storage) {
      load();
    } else {
      setScrapbookLoaded(true);
    }
    return () => { cancelled = true; };
  }, []);

  // Persist on change
  useEffect(() => {
    if (!scrapsLoaded) return;
    if (typeof window === "undefined" || !window.storage) return;
    window.storage.set("scraps:list", JSON.stringify(scraps)).catch(() => {});
  }, [scraps, scrapsLoaded]);

  useEffect(() => {
    if (!scrapbookLoaded) return;
    if (typeof window === "undefined" || !window.storage) return;
    window.storage.set("scrapbook:list", JSON.stringify(scrapbook)).catch(() => {});
  }, [scrapbook, scrapbookLoaded]);

  // Load dismissed items
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await window.storage.get("dismissed:items");
        if (!cancelled && result) {
          setDismissedItems(JSON.parse(result.value));
        }
      } catch (e) {
        // No saved data yet
      } finally {
        if (!cancelled) setDismissedLoaded(true);
      }
    }
    if (typeof window !== "undefined" && window.storage) {
      load();
    } else {
      setDismissedLoaded(true);
    }
    return () => { cancelled = true; };
  }, []);

  // Persist dismissed items
  useEffect(() => {
    if (!dismissedLoaded) return;
    if (typeof window === "undefined" || !window.storage) return;
    window.storage.set("dismissed:items", JSON.stringify(dismissedItems)).catch(() => {});
  }, [dismissedItems, dismissedLoaded]);

  const dismissItem = (key) => {
    setDismissedItems(prev => prev.includes(key) ? prev : [...prev, key]);
  };

  // Show a transient toast. `undo` (optional) renders an Undo button. Auto-dismisses.
  const showToast = (message, undo = null) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: makeId(), message, undo });
    toastTimer.current = setTimeout(() => setToast(null), undo ? 8000 : 3500);
  };
  const dismissToast = () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
  };

  const addScrap = (scrap) => {
    setScraps(prev => [...prev, { ...scrap, id: makeId() }]);
    bumpEngagement("pantryAdds");
    showToast(`Added ${scrap.label || scrap.type}`);
  };
  const removeScrap = (id, silent = false) => {
    const removed = scraps.find(s => s.id === id);
    setScraps(prev => prev.filter(s => s.id !== id));
    if (removed && !silent) {
      // Re-insert at its original position on undo so the list doesn't reshuffle.
      const idx = scraps.findIndex(s => s.id === id);
      showToast(`Removed ${removed.label || removed.type}`, () => {
        setScraps(prev => {
          const next = [...prev];
          next.splice(Math.min(idx, next.length), 0, removed);
          return next;
        });
        dismissToast();
      });
    }
  };
  const clearAll = (silent = false) => {
    const snapshot = scraps;
    setScraps([]);
    if (snapshot.length > 0 && !silent) {
      showToast(`Cleared ${snapshot.length} item${snapshot.length > 1 ? "s" : ""}`, () => {
        setScraps(snapshot);
        dismissToast();
      });
    }
  };
  const restoreAll = (list) => setScraps(list);

  const addScrapbookEntry = (entry) => {
    const today = new Date().toISOString().slice(0, 10);
    setScrapbook(prev => [...prev, {
      ...entry,
      kind: entry.kind || "builder",
      id: makeId(),
      savedAt: today,
    }]);
    bumpEngagement("scrapbookEntries");
    if (entry.kind === "builder" || entry.template) {
      bumpEngagement("recipesBuilt");
    }
  };
  const removeScrapbookEntry = (id) => {
    setScrapbook(prev => prev.filter(e => e.id !== id));
  };

  // Unified exploration stack for the two overlay types that can chain into each
  // other: ingredient deep-dives and template walkthroughs. Each entry is
  // { type: 'dive', dive } or { type: 'template', name }. "Back" pops one level of
  // whatever kind; "close" clears everything. This makes back-navigation work no
  // matter how dive→template→dive jumps interleave.
  const [navStack, setNavStack] = useState([]);
  const navTop = navStack.length > 0 ? navStack[navStack.length - 1] : null;
  const openDeepDive = navTop && navTop.type === "dive" ? navTop.dive : null;
  const openTemplateName = navTop && navTop.type === "template" ? navTop.name : null;

  const pushNav = (entry) => {
    setNavStack(prev => {
      const top = prev[prev.length - 1];
      // Avoid pushing a duplicate of whatever is already on top.
      if (top) {
        if (entry.type === "dive" && top.type === "dive" && top.dive.name === entry.dive.name) return prev;
        if (entry.type === "template" && top.type === "template" && top.name === entry.name) return prev;
      }
      return [...prev, entry];
    });
  };
  const openIngredientDeepDive = (name) => {
    const dive = findDeepDive(name);
    if (dive) pushNav({ type: "dive", dive });
  };
  const handleDeepDiveTemplateOpen = (templateName) => {
    pushNav({ type: "template", name: templateName });
  };
  const closeNav = () => setNavStack([]);
  const backNav = () => setNavStack(prev => prev.slice(0, -1));
  const navDepth = navStack.length;
  const seedDemo = () => {
    const today = new Date();
    const daysAgo = (n) => {
      const d = new Date(today);
      d.setDate(d.getDate() - n);
      return d.toISOString().slice(0, 10);
    };
    const demo = [
      // Healthy, plenty of time
      {
        id: "demo-1",
        type: "Cooked Infused Oil (confit oil)",
        location: "fridge",
        dateStored: daysAgo(7),
        label: "Apple-parsnip-carrot oil",
        note: "From Sunday's confit. Saving for popcorn night.",
      },
      // Healthy, plenty of time
      {
        id: "demo-2",
        type: "Fried Shallots",
        location: "pantry",
        dateStored: daysAgo(3),
        label: "Crispy shallots",
        note: "",
      },
      // Healthy, plenty of time
      {
        id: "demo-3",
        type: "Rendered Fat (bacon, chicken)",
        location: "fridge",
        dateStored: daysAgo(20),
        label: "Schmaltz",
        note: "From the roast chicken. Use to start the next hash.",
      },
      // Healthy, plenty of time (freezer)
      {
        id: "demo-4",
        type: "Parmesan Rinds",
        location: "freezer",
        dateStored: daysAgo(60),
        label: "",
        note: "",
      },
      // Healthy
      {
        id: "demo-5",
        type: "Pickle Brine",
        location: "fridge",
        dateStored: daysAgo(30),
        label: "Half-sour brine",
        note: "Tenderized last week's chicken beautifully.",
      },
      // Warning zone (~3 days left)
      {
        id: "demo-6",
        type: "Soup or Stew",
        location: "fridge",
        dateStored: daysAgo(2),
        label: "Slow-cooker scrap soup",
        note: "Sweet potato + chicken fat. Eat or freeze soon.",
      },
      // Warning zone — pesto, almost gone
      {
        id: "demo-7",
        type: "Relishes & Sauces",
        location: "fridge",
        dateStored: daysAgo(4),
        label: "Roasted pepper relish",
        note: "Made from leftover grilled peppers.",
      },
      // Past prime — will show "If your senses say yes" suggestions
      {
        id: "demo-8",
        type: "Vegetable/Fruit Confit",
        location: "fridge",
        dateStored: daysAgo(28),
        label: "Garlic confit",
        note: "Soft, sweet cloves. Submerged in oil.",
      },
      // Past prime — leftover meat
      {
        id: "demo-9",
        type: "Cooked Meat or Poultry",
        location: "fridge",
        dateStored: daysAgo(6),
        label: "Pulled chicken",
        note: "",
      },
      // Long-haul freezer item
      {
        id: "demo-10",
        type: "Vegetable Scrap Bag (for stock)",
        location: "freezer",
        dateStored: daysAgo(45),
        label: "Stock bag #3",
        note: "Carrot ends, kale stems, onion skins.",
      },
    ];
    setScraps(demo);
  };

  // Tab metadata (label + icon) keyed by id, both from the shared module-level
  // maps so the nav and Settings never drift. Order comes from tabOrder, flattened.
  const tabs = flattenTabOrder(tabOrder).map(id => ({ id, label: TAB_LABELS[id], icon: TAB_ICONS[id] }));

  return (
    <div
      className="scrap-app min-h-screen bg-[var(--bg)] text-[var(--ink)]"
      data-theme={resolvedTheme}
      data-textsize={textSize}
      style={{
        backgroundColor: "var(--bg)",
        color: "var(--ink)",
        backgroundImage: `radial-gradient(circle at 20% 30%, var(--vignette-1) 0%, transparent 50%), radial-gradient(circle at 80% 70%, var(--vignette-2) 0%, transparent 50%)`,
        fontFamily: "'Source Sans 3', 'Source Sans Pro', 'Inter', system-ui, -apple-system, sans-serif"
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Source+Sans+3:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Caveat:wght@500;600&display=swap');
        .scrap-app {
          /* Light theme — LINEN: paper-white ground, sage green hero, soft terracotta spark */
          --surface: #ffffff;       /* clean paper — cards/panels */
          --bg: #f7f5ef;            /* warm linen — page ground */
          --ink: #2f3a33;           /* deep sage-charcoal text */
          --ink-soft: #5a6058;      /* readable secondary */
          --ink-faint: #9aa093;     /* placeholder only */
          --accent: #5e7259;        /* SAGE GREEN — hero/structural */
          --accent-deep: #4a5c46;   /* deeper sage for hover/press */
          --border: #e3ded2;        /* soft linen border */
          --gold: #c47b5a;          /* terracotta, ornament/divider warmth */
          --moss: #7d9070;          /* lighter sage secondary */
          --ochre: #c47b5a;         /* terracotta accent */
          --surface-warm: #f3f0e7;  /* warm linen highlight card */
          --surface-moss: #eaefe2;  /* sage-tinted success bg */
          --surface-alert: #f8ece4; /* soft terracotta alert bg */
          --border-60: rgba(214, 208, 194, 0.7);
          --border-40: rgba(214, 208, 194, 0.45);
          --accent-40: rgba(94, 114, 89, 0.4);
          --accent-30: rgba(94, 114, 89, 0.3);
          --accent-10: rgba(94, 114, 89, 0.1);
          --surface-30: rgba(255, 255, 255, 0.3);
          --moss-60: rgba(125, 144, 112, 0.6);
          --vignette-1: rgba(94, 114, 89, 0.06);
          --vignette-2: rgba(196, 123, 90, 0.05);
          /* Brand spark — soft terracotta. Fill behind bold/large text; spark-text deeper for small text. */
          --spark: #b6633f;          /* terracotta CTA fill — white text clears AA large */
          --spark-deep: #9c5230;
          --spark-text: #b15f3c;     /* terracotta small text on linen — clears AA normal */
          --on-spark: #fffaf5;       /* text/icon on a terracotta fill */
        }
        .scrap-app[data-theme="dark"] {
          /* Dark — LINEN: deep green-charcoal ground, brightened sage + warm terracotta. */
          --surface: #2b302a;       /* green-charcoal card */
          --bg: #21251f;            /* deep green-black ground */
          --ink: #ecebe0;           /* warm off-white */
          --ink-soft: #b8bab0;      /* warm muted */
          --ink-faint: #7e8274;
          --accent: #9fb389;        /* brightened sage, legible on dark */
          --accent-deep: #b3c79e;
          --border: #3d433a;        /* dark green border */
          --gold: #d98b62;
          --moss: #a6ba8e;
          --ochre: #d98b62;
          --surface-warm: #2e332b;  /* warm highlight */
          --surface-moss: #2a3026;  /* faint sage tint */
          --surface-alert: #322822; /* warm terracotta-tinted alert */
          --border-60: rgba(61, 67, 58, 0.7);
          --border-40: rgba(61, 67, 58, 0.45);
          --accent-40: rgba(159, 179, 137, 0.4);
          --accent-30: rgba(159, 179, 137, 0.3);
          --accent-10: rgba(159, 179, 137, 0.12);
          --surface-30: rgba(43, 48, 42, 0.3);
          --moss-60: rgba(166, 186, 142, 0.6);
          --vignette-1: rgba(217, 139, 98, 0.05);
          --vignette-2: rgba(159, 179, 137, 0.04);
          --spark: #d98b62;          /* warm terracotta on dark */
          --spark-deep: #e49b73;
          --spark-text: #e09b73;     /* terracotta text on green-charcoal */
          --on-spark: #21251f;       /* dark text on terracotta fill */
        }
        .font-display { font-family: 'Spectral', 'Source Serif Pro', Georgia, 'Times New Roman', serif; font-weight: 500; letter-spacing: 0; }
        /* Linen: soften the square frame with a gentle 3px radius on buttons, inputs,
           and bordered panels — the look the Linen mockup carried. Single-edge dividers
           (border-b / border-t accents) are unaffected since they have no full border. */
        .scrap-app button,
        .scrap-app input,
        .scrap-app textarea,
        .scrap-app select { border-radius: 3px; }
        .font-hand { font-family: 'Caveat', 'Bradley Hand', cursive; }
        /* Hide the horizontal scrollbar on the tab row (WebKit/iOS); the edge
           fades are the scroll affordance instead. Firefox/IE use inline styles. */
        .scrap-app nav .overflow-x-auto::-webkit-scrollbar { display: none; height: 0; }
        /* Guarantee variable-based text utilities resolve even if Tailwind
           doesn't generate the arbitrary class (prevents dark-on-dark labels). */
        .scrap-app .text-\[var\(--surface\)\] { color: var(--surface) !important; }
        .scrap-app .text-\[var\(--ink\)\] { color: var(--ink); }
        .scrap-app .text-\[var\(--on-spark\)\] { color: var(--on-spark) !important; }
        .scrap-app { font-family: 'Source Sans 3', 'Source Sans Pro', 'Inter', system-ui, sans-serif; }
        .scrap-app input { background: var(--surface); color: var(--ink); }
        .scrap-app input::placeholder { color: var(--ink-faint); }
        .scrap-app textarea { background: var(--surface); color: var(--ink); }
        .scrap-app textarea::placeholder { color: var(--ink-faint); }
        /* Text size scale — overrides Tailwind's fixed rem text classes within the app.
           Tailwind text-* classes use root-relative rem, so a container font-size won't
           affect them. We scale each class explicitly per text-size scope. */
        .scrap-app[data-textsize="large"] .text-xs { font-size: 0.85rem; line-height: 1.2rem; }
        .scrap-app[data-textsize="large"] .text-sm { font-size: 1rem; line-height: 1.5rem; }
        .scrap-app[data-textsize="large"] .text-base { font-size: 1.15rem; line-height: 1.65rem; }
        .scrap-app[data-textsize="large"] .text-lg { font-size: 1.28rem; line-height: 1.85rem; }
        .scrap-app[data-textsize="large"] .text-xl { font-size: 1.45rem; line-height: 2rem; }
        .scrap-app[data-textsize="large"] .text-2xl { font-size: 1.75rem; line-height: 2.2rem; }
        .scrap-app[data-textsize="large"] .text-3xl { font-size: 2.2rem; line-height: 2.5rem; }
        .scrap-app[data-textsize="large"] .text-4xl { font-size: 2.6rem; line-height: 2.8rem; }
        .scrap-app[data-textsize="large"] .text-5xl { font-size: 3.4rem; line-height: 1; }

        .scrap-app[data-textsize="xlarge"] .text-xs { font-size: 0.95rem; line-height: 1.35rem; }
        .scrap-app[data-textsize="xlarge"] .text-sm { font-size: 1.15rem; line-height: 1.7rem; }
        .scrap-app[data-textsize="xlarge"] .text-base { font-size: 1.3rem; line-height: 1.85rem; }
        .scrap-app[data-textsize="xlarge"] .text-lg { font-size: 1.45rem; line-height: 2rem; }
        .scrap-app[data-textsize="xlarge"] .text-xl { font-size: 1.65rem; line-height: 2.2rem; }
        .scrap-app[data-textsize="xlarge"] .text-2xl { font-size: 2rem; line-height: 2.4rem; }
        .scrap-app[data-textsize="xlarge"] .text-3xl { font-size: 2.5rem; line-height: 2.8rem; }
        .scrap-app[data-textsize="xlarge"] .text-4xl { font-size: 3rem; line-height: 3.2rem; }
        .scrap-app[data-textsize="xlarge"] .text-5xl { font-size: 3.9rem; line-height: 1; }
        /* Settings panel controls must not scale with the text-size setting —
           otherwise adjusting the control changes the control itself. */
        .scrap-app[data-textsize] .settings-panel .text-xs { font-size: 0.75rem; line-height: 1rem; }
        .scrap-app[data-textsize] .settings-panel .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
        .settings-fixed-text { font-size: 0.8rem !important; }
      `}</style>

      {/* Header */}
      <header className="border-b-2 border-[var(--ink)] bg-[var(--surface)]" style={{ backgroundColor: "var(--surface)" }}>
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between gap-3 mb-2">
            <span className="text-xs uppercase tracking-[0.3em] text-[var(--ink-soft)]">The art of cooking with what you have</span>
            {/* Quick controls — Theme + Settings. How-this-works now lives on the
                Home tab (the front door), so the standalone Help button is gone. */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  const order = ["light", "dark", "system"];
                  const i = order.indexOf(theme);
                  setTheme(order[(i + 1) % order.length]);
                }}
                className="w-9 h-9 flex items-center justify-center border border-[var(--border)] rounded-[3px] text-[var(--accent)] hover:border-[var(--accent)] transition"
                style={{ backgroundColor: "var(--surface)" }}
                title={
                  theme === "light" ? "Theme: Light — tap for Dark" :
                  theme === "dark" ? "Theme: Dark — tap for Auto" :
                  "Theme: Auto — tap for Light"
                }
                aria-label="Change theme"
              >
                {theme === "light" ? <Sun className="w-4 h-4" /> :
                 theme === "dark" ? <Moon className="w-4 h-4" /> :
                 <Monitor className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setSettingsOpen(true)}
                className="w-9 h-9 flex items-center justify-center border border-[var(--border)] rounded-[3px] text-[var(--accent)] hover:border-[var(--accent)] transition"
                style={{ backgroundColor: "var(--surface)" }}
                title="Settings"
                aria-label="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl text-[var(--ink)] mb-2">
            Scrap Alchemy
          </h1>
          <p className="text-sm text-[var(--ink-soft)] italic max-w-xl">
            Turn leftovers and scraps into meals worth eating. Tell it what you have — let it show you what's possible.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <nav className="border-b-2 border-[var(--ink)] bg-[var(--surface)] sticky top-0 z-10" style={{ backgroundColor: "var(--surface)" }}>
        <div className="max-w-4xl mx-auto px-3 sm:px-6">
          {/* Home is a fixed anchor to the LEFT of the scrolling row (not inside it,
              so nothing scrolls under/through it). It collapses to icon-only once the
              row is scrolled right, to save width. The remaining tabs scroll beside it. */}
          <div className="flex items-stretch gap-1 py-2">
            {(() => {
              const homeTab = tabs.find(t => t.id === "home");
              if (!homeTab) return null;
              const HomeI = homeTab.icon;
              const isActive = tab === "home";
              const collapsed = tabOverflow.left;
              return (
                <button
                  onClick={() => setTab("home")}
                  title="Home"
                  aria-label="Home"
                  className={`flex items-center gap-2 py-2.5 text-sm whitespace-nowrap border transition font-semibold flex-shrink-0 ${
                    collapsed ? "px-2.5" : "px-4"
                  } ${isActive ? "shadow-sm" : "hover:border-[var(--accent)] hover:text-[var(--ink)]"}`}
                  style={{
                    backgroundColor: isActive ? "var(--accent)" : "var(--surface)",
                    color: isActive ? "var(--surface)" : "var(--ink-soft)",
                    borderColor: isActive ? "var(--accent)" : "var(--border)",
                    borderBottomColor: isActive ? "var(--spark)" : "var(--border)",
                    borderBottomWidth: isActive ? "3px" : "2px",
                  }}
                >
                  <HomeI className="w-4 h-4 flex-shrink-0" style={{ color: isActive ? "var(--surface)" : "var(--ink-soft)" }} />
                  {!collapsed && homeTab.label}
                </button>
              );
            })()}

            {/* The remaining tabs, horizontally scrollable */}
            <div className="relative flex-1 min-w-0">
              <div
                ref={tabScrollRef}
                onScroll={updateTabOverflow}
                className="flex gap-1 overflow-x-auto"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {tabs.filter(t => t.id !== "home").map(t => {
                  const Icon = t.icon;
                  const isActive = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      ref={el => { tabBtnRefs.current[t.id] = el; }}
                      onClick={() => setTab(t.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 text-sm whitespace-nowrap border transition font-semibold flex-shrink-0 ${
                        isActive ? "shadow-sm" : "hover:border-[var(--accent)] hover:text-[var(--ink)]"
                      }`}
                      style={{
                        backgroundColor: isActive ? "var(--accent)" : "var(--surface)",
                        color: isActive ? "var(--surface)" : "var(--ink-soft)",
                        borderColor: isActive ? "var(--accent)" : "var(--border)",
                        borderBottomColor: isActive ? "var(--spark)" : "var(--border)",
                        borderBottomWidth: isActive ? "3px" : "2px",
                      }}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: isActive ? "var(--surface)" : "var(--ink-soft)" }} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
              {/* Left fade — hints there are tabs hidden behind the start of the row */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-0 bottom-0 left-0 transition-opacity duration-200"
                style={{
                  width: "1.5rem",
                  opacity: tabOverflow.left ? 1 : 0,
                  background: "linear-gradient(to right, var(--surface), transparent)",
                }}
              />
              {/* Right fade — more tabs extend past the right edge */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-0 bottom-0 right-0 transition-opacity duration-200"
                style={{
                  width: "1.5rem",
                  opacity: tabOverflow.right ? 1 : 0,
                  background: "linear-gradient(to left, var(--surface), transparent)",
                }}
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8 pb-20">
        {tab === "home" && (
          <HomeTab
            scraps={scraps}
            scrapbook={scrapbook}
            engagement={engagement}
            dismissedItems={dismissedItems}
            dismissItem={dismissItem}
            onTabChange={setTab}
            openDeepDive={openIngredientDeepDive}
            onOpenTemplate={handleDeepDiveTemplateOpen}
            tabOrder={tabOrder}
          />
        )}
        {tab === "builder" && (
          <MealBuilder
            scraps={scraps}
            addToScrapbook={addScrapbookEntry}
            openDeepDive={openIngredientDeepDive}
            bumpEngagement={bumpEngagement}
            incModal={incModal}
            decModal={decModal}
            engagement={engagement}
            dismissedItems={dismissedItems}
            dismissItem={dismissItem}
            onTabChange={setTab}
            startTab={startTab}
          />
        )}
        {tab === "pantry" && (
          <ScrapTracker
            scraps={scraps}
            addScrap={addScrap}
            removeScrap={removeScrap}
            seedDemo={seedDemo}
            clearAll={clearAll}
            restoreAll={restoreAll}
            loaded={scrapsLoaded}
            openDeepDive={openIngredientDeepDive}
            onOpenTemplate={handleDeepDiveTemplateOpen}
            incModal={incModal}
            decModal={decModal}
          />
        )}
        {tab === "templates" && (
          <TemplateBrowser
            onOpenTemplate={handleDeepDiveTemplateOpen}
          />
        )}
        {tab === "scrapbook" && (
          <Scrapbook
            entries={scrapbook}
            addEntry={addScrapbookEntry}
            removeEntry={removeScrapbookEntry}
            loaded={scrapbookLoaded}
            incModal={incModal}
            decModal={decModal}
            openDeepDive={openIngredientDeepDive}
          />
        )}
        {tab === "subs" && <SubstitutionFinder openDeepDive={openIngredientDeepDive} />}
        {tab === "storage" && <StorageTimer openDeepDive={openIngredientDeepDive} onOpenTemplate={handleDeepDiveTemplateOpen} />}
        {tab === "support" && (
          <Support
            openShareApp={() => setShareAppOpen(true)}
            engagement={engagement}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--surface)] py-6" style={{ backgroundColor: "var(--surface)" }}>
        <div className="max-w-4xl mx-auto px-6 text-xs text-[var(--ink-soft)] text-center">
          <div className="flex items-center justify-center gap-x-4 gap-y-2 flex-wrap">
            <button
              onClick={() => setShareAppOpen(true)}
              className="text-[var(--accent)] hover:text-[var(--ink)] flex items-center gap-1 uppercase tracking-widest font-semibold"
            >
              <Share2 className="w-3 h-3" />
              Share the app
            </button>
            <span className="text-[var(--border)]">·</span>
            <button
              onClick={() => setTab("support")}
              className="text-[var(--accent)] hover:text-[var(--ink)] flex items-center gap-1 uppercase tracking-widest font-semibold"
            >
              <Heart className="w-3 h-3" />
              Support
            </button>
            <span className="text-[var(--border)]">·</span>
            <button
              onClick={() => setSettingsOpen(true)}
              className="text-[var(--accent)] hover:text-[var(--ink)] flex items-center gap-1 uppercase tracking-widest font-semibold"
            >
              <Settings className="w-3 h-3" />
              Settings
            </button>
          </div>
        </div>
      </footer>

      {/* Deep-dive modal */}
      {openDeepDive && (
        <DeepDiveModal
          ingredient={openDeepDive}
          onClose={closeNav}
          onBack={navDepth > 1 ? backNav : null}
          onOpenTemplate={handleDeepDiveTemplateOpen}
          onOpenDeepDive={openIngredientDeepDive}
          incModal={incModal}
          decModal={decModal}
        />
      )}

      {/* Template walkthrough — root-level so it overlays any tab and closing
          returns you to where you were, not to the Templates tab. */}
      {openTemplateName && (
        <TemplateModal
          name={openTemplateName}
          onClose={closeNav}
          onBack={navDepth > 1 ? backNav : null}
          addToScrapbook={addScrapbookEntry}
          openDeepDive={openIngredientDeepDive}
          incModal={incModal}
          decModal={decModal}
        />
      )}

      {/* Engagement prompts */}
      {activePrompt && (
        <EngagementPrompt
          kind={activePrompt}
          onDismiss={() => dismissPrompt("dismiss")}
          onAct={() => dismissPrompt("act")}
        />
      )}

      {/* Share-the-app modal */}
      {shareAppOpen && (
        <ShareAppModal
          onClose={() => setShareAppOpen(false)}
          incModal={incModal}
          decModal={decModal}
        />
      )}

      {/* Settings modal */}
      {settingsOpen && (
        <SettingsModal
          theme={theme}
          setTheme={setTheme}
          textSize={textSize}
          setTextSize={setTextSize}
          tabOrder={tabOrder}
          setTabOrder={setTabOrder}
          startTab={startTab}
          setStartTab={setStartTab}
          onClose={() => setSettingsOpen(false)}
          incModal={incModal}
          decModal={decModal}
        />
      )}

      {/* Transient toast with optional Undo */}
      <Toast
        toast={toast}
        onUndo={() => { if (toast && toast.undo) toast.undo(); }}
        onDismiss={dismissToast}
      />
    </div>
  );
}
