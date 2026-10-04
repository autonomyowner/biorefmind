/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as analytics from "../analytics.js";
import type * as assistant from "../assistant.js";
import type * as auth from "../auth.js";
import type * as companies from "../companies.js";
import type * as crops from "../crops.js";
import type * as demo from "../demo.js";
import type * as enterprise from "../enterprise.js";
import type * as http from "../http.js";
import type * as labs from "../labs.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_accounts from "../lib/accounts.js";
import type * as lib_catalog from "../lib/catalog.js";
import type * as lib_crops from "../lib/crops.js";
import type * as lib_market from "../lib/market.js";
import type * as lib_pricing from "../lib/pricing.js";
import type * as lib_scoring from "../lib/scoring.js";
import type * as lib_shipmentView from "../lib/shipmentView.js";
import type * as market from "../market.js";
import type * as seed from "../seed.js";
import type * as shipments from "../shipments.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  analytics: typeof analytics;
  assistant: typeof assistant;
  auth: typeof auth;
  companies: typeof companies;
  crops: typeof crops;
  demo: typeof demo;
  enterprise: typeof enterprise;
  http: typeof http;
  labs: typeof labs;
  "lib/access": typeof lib_access;
  "lib/accounts": typeof lib_accounts;
  "lib/catalog": typeof lib_catalog;
  "lib/crops": typeof lib_crops;
  "lib/market": typeof lib_market;
  "lib/pricing": typeof lib_pricing;
  "lib/scoring": typeof lib_scoring;
  "lib/shipmentView": typeof lib_shipmentView;
  market: typeof market;
  seed: typeof seed;
  shipments: typeof shipments;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
