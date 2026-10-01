import { query } from "./_generated/server";
import { CROPS } from "./lib/crops";

export const list = query({
  args: {},
  handler: async () =>
    CROPS.map((c) => ({ key: c.key, name: c.name, unit: c.unit, fields: c.fields.map((f) => ({ ...f })) })),
});
