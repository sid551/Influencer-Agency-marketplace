import { describe, expect, it } from "vitest";

import {
  citiesForState,
  findState,
  INDIAN_STATES,
  isIndianState,
} from "@/lib/locations";

describe("locations", () => {
  it("exposes every Indian state and union territory", () => {
    expect(INDIAN_STATES).toHaveLength(36);
    expect(INDIAN_STATES).toContain("Maharashtra");
    expect(INDIAN_STATES).toContain("Delhi");
    expect(INDIAN_STATES).toContain("Telangana");
  });

  it("matches state names case-insensitively", () => {
    expect(findState(" tamil nadu ")).toBe("Tamil Nadu");
    expect(findState("KARNATAKA")).toBe("Karnataka");
    expect(isIndianState("KA")).toBe(false);
    expect(findState("")).toBeUndefined();
  });

  it("returns the cities of the chosen state only", () => {
    const maharashtra = citiesForState("Maharashtra");
    expect(maharashtra).toContain("Mumbai");
    expect(maharashtra).toContain("Pune");
    expect(maharashtra).not.toContain("Bengaluru");
  });

  it("returns nothing for an unknown state", () => {
    expect(citiesForState("Atlantis")).toEqual([]);
    expect(citiesForState(undefined)).toEqual([]);
  });
});
