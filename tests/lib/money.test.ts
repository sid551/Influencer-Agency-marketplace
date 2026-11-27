import { describe, expect, it } from "vitest";

import {
  CURRENCY_LOCALE,
  DEFAULT_CURRENCY,
  formatMoney,
  formatMoneyRange,
} from "@/lib/money";

describe("money formatting", () => {
  it("uses INR and en-IN by default", () => {
    expect(DEFAULT_CURRENCY).toBe("INR");
    expect(CURRENCY_LOCALE).toBe("en-IN");
    expect(formatMoney(450)).toBe("₹450.00");
  });

  it("renders Indian digit grouping", () => {
    expect(formatMoney(1234567.89)).toBe("₹12,34,567.89");
    expect(formatMoney(100000)).toBe("₹1,00,000.00");
  });

  it("falls back to INR for unknown or invalid codes", () => {
    expect(formatMoney(1000, "XYZ")).toBe("₹1,000.00");
    expect(formatMoney(1000, "USD")).toBe("₹1,000.00");
    expect(formatMoney(1000, "")).toBe("₹1,000.00");
  });

  it("formats a budget range with INR on both ends", () => {
    expect(formatMoneyRange(1200, 1800)).toBe("₹1,200.00 – ₹1,800.00");
    expect(formatMoneyRange(1000, 2000, "XYZ")).toBe(
      "₹1,000.00 – ₹2,000.00",
    );
  });
});
