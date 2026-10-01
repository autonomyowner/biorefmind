import { ConvexError } from "convex/values";

/** The readable message behind a failed backend call. */
export function errorMessage(e: unknown): string {
  if (e instanceof ConvexError && typeof e.data === "string") return e.data;
  return "Something went wrong. Please try again.";
}
