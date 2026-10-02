import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanName, cleanPhone, cleanRegion, isAdmin, labListed, pickKnown, REFUSE } from "./accounts";
import { ANALYSES } from "./catalog";

const NOW = 1_800_000_000_000;

describe("labListed", () => {
  test("trial running, trial over, paid, paid expired, not a lab", () => {
    expect(labListed({ kind: "lab", plan: "lab_trial", trialEndsAt: NOW + 1 }, NOW)).toBe(true);
    expect(labListed({ kind: "lab", plan: "lab_trial", trialEndsAt: NOW - 1 }, NOW)).toBe(false);
    expect(labListed({ kind: "lab", plan: "lab_paid", paidUntil: NOW + 1 }, NOW)).toBe(true);
    expect(labListed({ kind: "lab", plan: "lab_paid", paidUntil: NOW - 1 }, NOW)).toBe(false);
    expect(labListed({ kind: "factory", plan: "enterprise" }, NOW)).toBe(false);
  });
});

describe("isAdmin", () => {
  afterEach(() => vi.unstubAllEnvs());
  test("unset list means nobody", () => {
    vi.stubEnv("ADMIN_EMAILS", "");
    expect(isAdmin("a@b.dz")).toBe(false);
  });
  test("case and spaces are ignored", () => {
    vi.stubEnv("ADMIN_EMAILS", " Boss@BiorefMind.com , other@x.dz ");
    expect(isAdmin("boss@biorefmind.com")).toBe(true);
    expect(isAdmin("OTHER@x.dz")).toBe(true);
    expect(isAdmin("nobody@x.dz")).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });
});

describe("field checks", () => {
  test("name, region, phone", () => {
    expect(cleanName("  Ferme Saïd ")).toBe("Ferme Saïd");
    expect(() => cleanName("A")).toThrow(REFUSE.name);
    expect(cleanRegion(" Sétif ")).toBe("Sétif");
    expect(() => cleanRegion("  ")).toThrow(REFUSE.region);
    expect(cleanPhone(" +213 555-12-34-56 ")).toBe("+213 555-12-34-56");
    expect(() => cleanPhone("12 34")).toThrow(REFUSE.phone);
    expect(() => cleanPhone("call me")).toThrow(REFUSE.phone);
  });
  test("pickKnown keeps known keys once, in catalog order", () => {
    expect(pickKnown(["mold", "nope", "moisture", "mold"], ANALYSES)).toEqual(["moisture", "mold"]);
  });
});
