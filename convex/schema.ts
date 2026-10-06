import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/** Workspace roles, highest first. */
export const memberRole = v.union(v.literal("owner"), v.literal("manager"), v.literal("inspector"));

/** A: pharmaceutical extraction · B: food-grade pectin / oils / bio-packaging · C: paper, fermentation, feed. */
export const route = v.union(v.literal("A"), v.literal("B"), v.literal("C"));

/** Lab values, all in percent. Any may be missing; missing values lower the confidence. */
export const labResults = v.object({
  moisture: v.optional(v.number()),
  mold: v.optional(v.number()),
  oxidation: v.optional(v.number()),
  punicalagin: v.optional(v.number()),
});

/** One analysis on a lab's price list (DA per sample, turnaround in working days). */
export const labPrice = v.object({ analysis: v.string(), priceDzd: v.number(), days: v.number() });

const qualifier = v.optional(v.union(v.literal("<"), v.literal(">"), v.literal("nd")));

/** Results as the lab reports them. Units are fixed per analysis (lib/labwork ANALYSIS_SPECS); panels carry their own. */
export const labResultsDoc = v.object({
  items: v.array(
    v.object({
      analysis: v.string(),
      value: v.number(),
      qualifier,
      uncertainty: v.optional(v.number()),
      method: v.string(),
    }),
  ),
  panels: v.array(
    v.object({
      analysis: v.string(),
      method: v.string(),
      lines: v.array(
        v.object({
          name: v.string(),
          value: v.number(),
          qualifier,
          unit: v.string(),
          limit: v.optional(v.number()),
          limitRef: v.optional(v.string()),
          pass: v.optional(v.boolean()),
        }),
      ),
    }),
  ),
  testedFrom: v.number(),
  testedTo: v.number(),
  deviations: v.optional(v.string()),
});

export const labSample = v.object({
  residue: v.string(),
  residueName: v.optional(v.string()),
  label: v.string(),
  state: v.union(v.literal("fresh"), v.literal("dried"), v.literal("frozen")),
  collectedAt: v.number(),
  region: v.string(),
  grams: v.number(),
  packaging: v.optional(v.string()),
  notes: v.optional(v.string()),
});

export default defineSchema({
  /** App profile, linked to the Better Auth login by lowercase email. */
  users: defineTable({
    email: v.string(),
    name: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  /**
   * One workspace per farm, lab or factory. Profile fields are optional in storage
   * (rows from before 2026-10-02) but required by companies.create.
   */
  companies: defineTable({
    name: v.string(),
    kind: v.union(v.literal("farm"), v.literal("lab"), v.literal("factory")),
    country: v.optional(v.string()),
    region: v.optional(v.string()),
    phone: v.optional(v.string()),
    services: v.optional(v.array(v.string())), // labs: keys from lib/catalog ANALYSES
    buys: v.optional(v.array(v.string())), // factories: keys from lib/catalog RESIDUES
    ownerId: v.id("users"),
    // free: farms · lab_trial / lab_paid: labs · enterprise: factories · trial/tier1/tier2: before 2026-10-02
    plan: v.union(
      v.literal("free"),
      v.literal("lab_trial"),
      v.literal("lab_paid"),
      v.literal("enterprise"),
      v.literal("trial"),
      v.literal("tier1"),
      v.literal("tier2"),
    ),
    trialEndsAt: v.optional(v.number()),
    paidUntil: v.optional(v.number()),
    shipmentSeq: v.number(), // last number used for shipment codes
    // Labs (2026-10-06, specs/2026-10-06-lab-requests-design.md)
    address: v.optional(v.string()),
    hours: v.optional(v.string()),
    retention: v.optional(v.string()), // how long the lab keeps samples, printed on certificates
    paused: v.optional(v.boolean()), // "pause new requests"
    prices: v.optional(v.array(labPrice)),
    requestSeq: v.optional(v.number()), // last number used for lab sample numbers
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_kind", ["kind"]),

  /** A factory asking for enterprise pricing; read on the admin page. */
  enterpriseRequests: defineTable({
    companyId: v.id("companies"),
    userId: v.id("users"),
    message: v.string(),
    createdAt: v.number(),
  }).index("by_created", ["createdAt"]),

  /** A lot a farm puts up for sale. Prices in DA per kg. Design: specs/2026-10-04-marketplace-design.md */
  listings: defineTable({
    companyId: v.id("companies"), // the farm selling
    residue: v.string(), // key from lib/catalog RESIDUES, or "other"
    residueName: v.optional(v.string()), // the farmer's own words, only with "other"
    quantityKg: v.number(), // as listed
    remainingKg: v.number(), // goes down with each sale; 0 → sold
    priceDzdPerKg: v.number(),
    region: v.string(),
    note: v.optional(v.string()),
    photoIds: v.array(v.id("_storage")),
    labRequestId: v.optional(v.id("labRequests")), // lab results the farm chose to show on this lot
    status: v.union(v.literal("open"), v.literal("sold"), v.literal("withdrawn")),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_status", ["status", "createdAt"])
    .index("by_company", ["companyId", "createdAt"]),

  /** A factory's offer on a lot; the farm accepts or declines it. */
  offers: defineTable({
    listingId: v.id("listings"),
    sellerId: v.id("companies"),
    buyerId: v.id("companies"),
    quantityKg: v.number(),
    priceDzdPerKg: v.number(),
    message: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("declined"), v.literal("withdrawn")),
    createdBy: v.id("users"),
    createdAt: v.number(),
    respondedAt: v.optional(v.number()),
  })
    .index("by_listing", ["listingId"])
    .index("by_buyer", ["buyerId", "createdAt"]),

  /** An accepted offer. The buyer owes BiorefMind `feeDzd` on top of `totalDzd`. */
  sales: defineTable({
    listingId: v.id("listings"),
    offerId: v.id("offers"),
    sellerId: v.id("companies"),
    buyerId: v.id("companies"),
    residue: v.string(),
    residueName: v.optional(v.string()),
    quantityKg: v.number(),
    priceDzdPerKg: v.number(),
    totalDzd: v.number(),
    feeDzd: v.number(),
    createdAt: v.number(),
  })
    .index("by_seller", ["sellerId", "createdAt"])
    .index("by_buyer", ["buyerId", "createdAt"])
    .index("by_created", ["createdAt"]),

  /** A farm or factory asking a lab to analyse one sample. Design: specs/2026-10-06-lab-requests-design.md */
  labRequests: defineTable({
    labId: v.id("companies"),
    clientId: v.id("companies"),
    clientKind: v.union(v.literal("farm"), v.literal("factory")),
    listingId: v.optional(v.id("listings")), // a farm's own lot, or the lot a factory bought
    saleId: v.optional(v.id("sales")), // factories: the purchase it is about
    analyses: v.array(labPrice), // prices as they were when requested
    totalDzd: v.number(),
    sample: labSample,
    delivery: v.union(v.literal("dropoff"), v.literal("courier")),
    tracking: v.optional(v.string()),
    status: v.union(
      v.literal("requested"),
      v.literal("accepted"),
      v.literal("declined"),
      v.literal("received"),
      v.literal("released"),
      v.literal("cancelled"),
    ),
    reason: v.optional(v.string()), // why it was declined or cancelled
    cancelledBy: v.optional(v.union(v.literal("client"), v.literal("lab"))),
    respondedAt: v.optional(v.number()),
    sampleNo: v.optional(v.string()),
    receivedAt: v.optional(v.number()),
    dueAt: v.optional(v.number()),
    condition: v.optional(v.string()), // the sample's condition on arrival
    draft: v.optional(labResultsDoc),
    releasedAt: v.optional(v.number()),
    reportId: v.optional(v.id("labReports")), // the current version
    paid: v.boolean(), // the lab's own bookkeeping
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_lab", ["labId", "createdAt"])
    .index("by_client", ["clientId", "createdAt"]),

  /**
   * One issued certificate version. Frozen when issued (ISO/IEC 17025): everything printed is
   * copied here, so later profile edits never change it. An amendment adds a new version.
   */
  labReports: defineTable({
    requestId: v.id("labRequests"),
    labId: v.id("companies"),
    version: v.number(),
    code: v.string(), // public verify code
    reportNo: v.string(),
    lab: v.object({ name: v.string(), address: v.string(), phone: v.string() }),
    client: v.object({ name: v.string(), region: v.string() }),
    sample: labSample,
    sampleNo: v.string(),
    condition: v.optional(v.string()),
    receivedAt: v.number(),
    retention: v.string(),
    results: labResultsDoc,
    releasedByName: v.string(),
    releasedByRole: v.string(),
    amendReason: v.optional(v.string()),
    replacedBy: v.optional(v.id("labReports")),
    score: v.optional(v.number()), // BiorefMind's reading, never printed on the certificate
    route: v.optional(route),
    releasedAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_request", ["requestId", "version"]),

  memberships: defineTable({
    companyId: v.id("companies"),
    userId: v.id("users"),
    role: memberRole,
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_company", ["companyId"])
    .index("by_company_user", ["companyId", "userId"]),

  /** Pending team invitations; accepted when a login with that email calls invitations.accept. */
  invitations: defineTable({
    companyId: v.id("companies"),
    email: v.string(),
    role: memberRole,
    invitedBy: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("revoked")),
    createdAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_email", ["email"]),

  /** One digital record per shipment (the Smart Biomass Pass). */
  shipments: defineTable({
    companyId: v.id("companies"),
    code: v.string(), // e.g. "BG-000042", unique per company
    crop: v.string(), // crop key from convex/lib/crops.ts, e.g. "pomegranate_peel"
    supplier: v.string(),
    origin: v.optional(v.string()),
    weightKg: v.number(),
    receivedAt: v.number(),
    photoIds: v.array(v.id("_storage")),
    lab: labResults,
    notes: v.optional(v.string()),
    // Scoring (convex/lib/scoring.ts)
    score: v.number(), // 0–100
    confidence: v.number(), // 0–1
    autoRoute: route, // what the engine decided
    route: route, // current route (autoRoute unless overridden)
    reasons: v.array(v.string()), // plain-English explanation lines
    overridden: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_company", ["companyId", "receivedAt"])
    .index("by_company_code", ["companyId", "code"])
    .index("by_company_route", ["companyId", "route"]),

  /** Which company a stored photo belongs to, so one company can never attach another's photo. */
  photoClaims: defineTable({
    storageId: v.id("_storage"),
    companyId: v.id("companies"),
  }).index("by_storage", ["storageId"]),

  /** HACCP / GMP trail: every inspector change to a route, with its reason. */
  routeOverrides: defineTable({
    companyId: v.id("companies"),
    shipmentId: v.id("shipments"),
    from: route,
    to: route,
    reason: v.string(),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_shipment", ["shipmentId", "createdAt"])
    .index("by_company", ["companyId", "createdAt"]),

  /** Admin's AI settings (one row). Design: specs/2026-10-06-ai-photo-check-design.md */
  aiSettings: defineTable({
    openrouterKey: v.optional(v.string()), // never returned to any client; falls back to env OPENROUTER_API_KEY
    model: v.optional(v.string()),
    photoCheck: v.boolean(),
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  }),

  /** The AI's look at a lot's photos. Shown publicly only when done; never a lab result. */
  photoChecks: defineTable({
    listingId: v.id("listings"),
    status: v.union(v.literal("pending"), v.literal("done"), v.literal("failed"), v.literal("off")),
    result: v.optional(
      v.object({
        match: v.union(v.literal("yes"), v.literal("unsure"), v.literal("no")),
        seen: v.object({ en: v.string(), ar: v.string() }),
        state: v.union(v.literal("fresh"), v.literal("dried"), v.literal("unclear")),
        concerns: v.array(
          v.union(
            v.literal("mould"),
            v.literal("wet"),
            v.literal("browning"),
            v.literal("foreign_matter"),
            v.literal("mixed"),
            v.literal("poor_photo"),
          ),
        ),
        tip: v.object({ en: v.string(), ar: v.string() }),
      }),
    ),
    model: v.optional(v.string()),
    costUsd: v.optional(v.number()),
    attempts: v.number(),
    retryDay: v.optional(v.number()), // UTC day of the latest "Try again"
    retries: v.optional(v.number()), // presses on retryDay
    createdAt: v.number(),
    finishedAt: v.optional(v.number()),
  })
    .index("by_listing", ["listingId"])
    .index("by_created", ["createdAt"]),

  /** AI assistant conversation, one running thread per user per company. */
  assistantMessages: defineTable({
    companyId: v.id("companies"),
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_company_user", ["companyId", "userId", "createdAt"]),
});
