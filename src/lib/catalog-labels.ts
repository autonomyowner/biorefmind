import { defineMessages } from "@/i18n/messages";

/** The backend's catalog keys (convex/lib/catalog.ts), in the order shown, with their labels. */
export const ANALYSIS_KEYS = [
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
/** Analyses reported as a list of named lines (convex/lib/catalog.ts PANEL_ANALYSES). */
export const PANEL_KEYS = ["heavy_metals", "mycotoxins", "pesticides"] as const;
/** Units printed per analysis (convex/lib/labwork.ts ANALYSIS_SPECS); panels carry a unit per line. */
export const ANALYSIS_UNITS: Record<string, string> = {
  moisture: "% (wet basis)",
  polyphenols: "mg GAE/g DM",
  punicalagin: "mg/g DM",
  pectin: "% DM",
  mold: "CFU/g",
  oxidation: "meq O₂/kg",
};
/** Default methods, pre-filled in the results form (the lab can change them). */
export const ANALYSIS_METHODS: Record<string, string> = {
  moisture: "Oven drying at 103–105 °C to constant mass",
  polyphenols: "Folin–Ciocalteu",
  punicalagin: "HPLC-DAD (α + β anomers)",
  pectin: "Acid extraction, gravimetric",
  mold: "Yeasts and moulds, ISO 21527-2 (DG18)",
  oxidation: "Peroxide value, ISO 3960",
  heavy_metals: "ICP-OES / AAS",
  mycotoxins: "HPLC-FLD",
  pesticides: "LC-MS/MS and GC-MS/MS multi-residue",
};
export const RESIDUE_KEYS = [
  "pomegranate_peels",
  "citrus_peels",
  "olive_pomace",
  "tomato_skins_seeds",
  "grape_marc",
  "date_pits",
  "corn_silk",
] as const;
/** Every residue a lot can have: the catalog plus "other" (the farmer typed what it is). */
export const LOT_RESIDUE_KEYS = [...RESIDUE_KEYS, "other"] as const;

export const catalogLabels = defineMessages({
  en: {
    analyses: {
      moisture: "Moisture",
      polyphenols: "Polyphenols",
      punicalagin: "Punicalagin",
      pectin: "Pectin",
      mold: "Yeasts & moulds",
      oxidation: "Peroxide value",
      heavy_metals: "Heavy metals",
      mycotoxins: "Mycotoxins",
      pesticides: "Pesticide residues",
      contamination: "Heavy metals",
    },
    residues: {
      pomegranate_peels: "Pomegranate peels",
      citrus_peels: "Citrus peels",
      olive_pomace: "Olive pomace",
      tomato_skins_seeds: "Tomato skins & seeds",
      grape_marc: "Grape marc",
      date_pits: "Date pits",
      corn_silk: "Corn silk",
      other: "Other",
    },
  },
  ar: {
    analyses: {
      moisture: "الرطوبة",
      polyphenols: "البوليفينول",
      punicalagin: "البونيكالاجين",
      pectin: "البكتين",
      mold: "الخمائر والفطريات",
      oxidation: "مؤشر البيروكسيد",
      heavy_metals: "المعادن الثقيلة",
      mycotoxins: "السموم الفطرية",
      pesticides: "بقايا المبيدات",
      contamination: "المعادن الثقيلة",
    },
    residues: {
      pomegranate_peels: "قشور الرمان",
      citrus_peels: "قشور الحمضيات",
      olive_pomace: "تفل الزيتون",
      tomato_skins_seeds: "قشور وبذور الطماطم",
      grape_marc: "تفل العنب",
      date_pits: "نوى التمر",
      corn_silk: "حرير الذرة",
      other: "أخرى",
    },
  },
});

/** A label for a catalog key; unknown keys show as-is. */
export function labelOf(map: Record<string, string>, key: string): string {
  return map[key] ?? key;
}

/** A lot's residue as shown: the farmer's own words for "other", else the catalog label. */
export function residueLabel(map: Record<string, string>, lot: { residue: string; residueName?: string }): string {
  return lot.residueName || labelOf(map, lot.residue);
}
