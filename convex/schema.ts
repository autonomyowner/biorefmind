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

export default defineSchema({
  /** App profile, linked to the Better Auth login by lowercase email. */
  users: defineTable({
    email: v.string(),
    name: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  /** One workspace per factory or lab. */
  companies: defineTable({
    name: v.string(),
    kind: v.union(v.literal("factory"), v.literal("lab")),
    country: v.optional(v.string()),
    ownerId: v.id("users"),
    plan: v.union(v.literal("trial"), v.literal("tier1"), v.literal("tier2")),
    trialEndsAt: v.number(),
    shipmentSeq: v.number(), // last number used for shipment codes
    createdAt: v.number(),
  }).index("by_owner", ["ownerId"]),

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

  /** AI assistant conversation, one running thread per user per company. */
  assistantMessages: defineTable({
    companyId: v.id("companies"),
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_company_user", ["companyId", "userId", "createdAt"]),
});
