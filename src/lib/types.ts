import type { Id } from "../../convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";

// Shapes returned by the backend. Source: docs/superpowers/contracts/phase-1-backend.md

export type Role = "owner" | "manager" | "inspector";
export type Route = "A" | "B" | "C";
export type Lab = { moisture?: number; mold?: number; oxidation?: number; punicalagin?: number };
export type Viewer = { _id: string; email: string; name: string; isAdmin: boolean } | null;

/** The three account types. Contract: docs/superpowers/specs/2026-10-02-three-account-types-design.md */
export type Kind = "farm" | "lab" | "factory";
export type Plan = "free" | "lab_trial" | "lab_paid" | "enterprise" | "trial" | "tier1" | "tier2";

export type Workspace = {
  companyId: Id<"companies">;
  name: string;
  kind: Kind;
  role: Role;
  region: string;
  phone: string;
  services?: string[];
  buys?: string[];
  plan: Plan;
  trialEndsAt?: number;
  paidUntil?: number;
  listed?: boolean;
};

export type DirectoryLab = { companyId: Id<"companies">; name: string; region: string; phone: string; services: string[] };

export type AdminOverview = {
  accounts: {
    companyId: Id<"companies">;
    name: string;
    kind: Kind;
    ownerEmail: string;
    region: string;
    phone: string;
    plan: Plan;
    trialEndsAt?: number;
    paidUntil?: number;
    listed?: boolean;
    createdAt: number;
  }[];
  requests: { _id: string; company: string; email: string; phone: string; message: string; createdAt: number }[];
};

export type ScoreResult = { score: number; confidence: number; route: Route; reasons: string[] };

export type ShipmentRow = {
  _id: Id<"shipments">;
  code: string;
  crop: string;
  supplier: string;
  weightKg: number;
  receivedAt: number;
  score: number;
  confidence: number;
  route: Route;
  autoRoute: Route;
  overridden: boolean;
  thumbUrl: string | null;
};

export type ShipmentDetail = ShipmentRow & {
  origin?: string;
  notes?: string;
  lab: Lab;
  reasons: string[];
  photoUrls: string[];
  createdByName: string;
  createdAt: number;
  overrides: { _id: string; from: Route; to: Route; reason: string; userName: string; createdAt: number }[];
  recommendations: string[];
};

export type Overview = {
  total: number;
  last30: number;
  byRoute: { A: number; B: number; C: number };
  avgScore: number;
  avgConfidence: number;
  overrideRate: number;
  trend: { day: string; count: number; avgScore: number }[];
  suppliers: { supplier: string; count: number; avgScore: number; shareA: number }[];
  recent: ShipmentRow[];
};

export type Crop = {
  key: string;
  name: string;
  unit: "%";
  fields: { key: keyof Lab; label: string; hint: string }[];
};

export type AssistantMessage = { _id: string; role: "user" | "assistant"; content: string; createdAt: number };
export type Member = { userId: string; name: string; email: string; role: Role };
export type Invitation = { _id: Id<"invitations">; email: string; role: Role; createdAt: number };

export const ROUTE_META: Record<Route, { label: string; use: string; color: string }> = {
  A: { label: "Route A · Pharmaceutical", use: "Medicinal extraction (punicalagin)", color: "var(--route-a)" },
  B: { label: "Route B · Food-grade", use: "Pectin, volatile oils, bio-packaging", color: "var(--route-b)" },
  C: { label: "Route C · Low-grade", use: "Paper, bio-fermentation, animal feed", color: "var(--route-c)" },
};

/** Marketplace shapes, straight from the backend (contract: specs/2026-10-04-marketplace-design.md). */
export type MyListing = FunctionReturnType<typeof api.market.myListings>[number];
export type ListingOffer = MyListing["offers"][number];
export type MarketListing = FunctionReturnType<typeof api.market.browse>[number];
export type PublicLot = FunctionReturnType<typeof api.market.publicLots>[number];
export type MyOffer = FunctionReturnType<typeof api.market.myOffers>[number];
export type Sale = FunctionReturnType<typeof api.market.mySales>[number];
export type AdminSales = FunctionReturnType<typeof api.admin.sales>;
