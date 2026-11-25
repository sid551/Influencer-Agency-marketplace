import { describe, expect, it } from "vitest";

import { uuidSchema } from "@/lib/validations/ids";

describe("uuidSchema", () => {
  it("accepts real row ids", () => {
    expect(uuidSchema.safeParse("20202020-0000-4000-8000-000000000001").success).toBe(true);
  });

  it("rejects untrusted action arguments", () => {
    for (const value of ["", "1", "../admin", "1 OR 1=1", " undefined", null, 42]) {
      expect(uuidSchema.safeParse(value).success).toBe(false);
    }
  });
});
