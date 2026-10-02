import { defineMessages } from "@/i18n/messages";

/** The backend's catalog keys (convex/lib/catalog.ts), in the order shown, with their labels. */
export const ANALYSIS_KEYS = ["moisture", "polyphenols", "punicalagin", "mold", "oxidation", "contamination"] as const;
export const RESIDUE_KEYS = [
  "pomegranate_peels",
  "citrus_peels",
  "olive_pomace",
  "tomato_skins_seeds",
  "grape_marc",
  "date_pits",
  "corn_silk",
] as const;

export const catalogLabels = defineMessages({
  en: {
    analyses: {
      moisture: "Moisture",
      polyphenols: "Polyphenols",
      punicalagin: "Punicalagin",
      mold: "Mold",
      oxidation: "Oxidation",
      contamination: "Contamination",
    },
    residues: {
      pomegranate_peels: "Pomegranate peels",
      citrus_peels: "Citrus peels",
      olive_pomace: "Olive pomace",
      tomato_skins_seeds: "Tomato skins & seeds",
      grape_marc: "Grape marc",
      date_pits: "Date pits",
      corn_silk: "Corn silk",
    },
  },
  ar: {
    analyses: {
      moisture: "الرطوبة",
      polyphenols: "البوليفينول",
      punicalagin: "البونيكالاجين",
      mold: "العفن",
      oxidation: "الأكسدة",
      contamination: "التلوث",
    },
    residues: {
      pomegranate_peels: "قشور الرمان",
      citrus_peels: "قشور الحمضيات",
      olive_pomace: "تفل الزيتون",
      tomato_skins_seeds: "قشور وبذور الطماطم",
      grape_marc: "تفل العنب",
      date_pits: "نوى التمر",
      corn_silk: "حرير الذرة",
    },
  },
});

/** A label for a catalog key; unknown keys show as-is. */
export function labelOf(map: Record<string, string>, key: string): string {
  return map[key] ?? key;
}
