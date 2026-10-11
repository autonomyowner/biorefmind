/** Analyses a lab can offer. Keys are stored; labels live in the website (src/lib/catalog-labels.ts). */
export const ANALYSES = [
  "moisture",
  "polyphenols",
  "punicalagin",
  "pectin",
  "mold",
  "oxidation",
  "heavy_metals",
  "mycotoxins",
  "pesticides",
] as const;

/** Analyses reported as a list of named parameters (each with value, unit and an optional limit). */
export const PANEL_ANALYSES = ["heavy_metals", "mycotoxins", "pesticides"] as const;

/** Residues a factory can say it buys. */
export const RESIDUES = [
  "pomegranate_peels",
  "citrus_peels",
  "olive_pomace",
  "tomato_skins_seeds",
  "grape_marc",
  "date_pits",
  "corn_silk",
  "corn_husks",
] as const;

/** Fresh produce a farm can sell (2026-10-11), besides residues. Same "other" + typed name rule. */
export const FRESH_PRODUCE = [
  "mushrooms",
  "pomegranates",
  "tomatoes",
  "potatoes",
  "onions",
  "peppers",
  "citrus",
  "dates",
  "olives",
  "grapes",
  "apples",
  "figs",
] as const;

/** What a lot is: a residue (leftovers) or fresh produce. Missing in storage = residue. */
export const CATEGORIES = ["residue", "fresh"] as const;
export type Category = (typeof CATEGORIES)[number];

export type Analysis = (typeof ANALYSES)[number];
export type Residue = (typeof RESIDUES)[number];
