import { query } from "./_generated/server";
import { scoreShipment } from "./lib/scoring";
import { validateLab } from "./lib/shipmentView";
import { labResults } from "./schema";

/** Public scoring demo for the landing page: no auth, nothing stored. */
export const score = query({
  args: { lab: labResults },
  handler: async (_ctx, { lab }) => {
    validateLab(lab);
    return scoreShipment("pomegranate_peel", lab);
  },
});
