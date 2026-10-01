import type { Id } from "../../convex/_generated/dataModel";

// Shapes returned by the backend. Source: docs/superpowers/contracts/phase-1-backend.md

export type Role = "owner" | "manager" | "inspector";
export type Route = "A" | "B" | "C";
export type Lab = { moisture?: number; mold?: number; oxidation?: number; punicalagin?: number };
export type Viewer = { _id: string; email: string; name: string } | null;

export type Workspace = {
  companyId: Id<"companies">;
  name: string;
  kind: "factory" | "lab";
  role: Role;
  plan: "trial" | "tier1" | "tier2";
  trialEndsAt: number;
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
