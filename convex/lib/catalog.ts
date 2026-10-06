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
] as const;

export type Analysis = (typeof ANALYSES)[number];
export type Residue = (typeof RESIDUES)[number];
