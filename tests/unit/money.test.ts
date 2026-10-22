import { describe, expect, it } from "vitest";
import { formatMoney, inputToMinor, prize } from "../../src/lib/money";

describe("money has no floating-point rounding", () => {
  it("preserves values above Number.MAX_SAFE_INTEGER", () => {
    expect(formatMoney("9007199254740999").replace(/\D/g, "")).toBe(
      "9007199254740999",
    );
  });
  it("accepts both decimal separators and different exponents", () => {
    expect(inputToMinor("10,01", 2)).toBe("1001");
    expect(inputToMinor("10.01", 2)).toBe("1001");
    expect(inputToMinor("123", 0)).toBe("123");
    expect(inputToMinor("0.001", 3)).toBe("1");
  });
  it.each(["0", "-1", "1e9", "NaN", "<script>", "1.111", " 1", "1,000.00"])(
    "rejects invalid input %s",
    (value) => {
      expect(() => inputToMinor(value, 2)).toThrow();
    },
  );
  it("rejects decimal inputs for zero-exponent assets", () => {
    expect(() => inputToMinor("1.1", 0)).toThrow();
  });
  it("matches backend HALF_UP commission rounding", () => {
    expect(prize("1000", 500)).toBe("1900");
    expect(prize("5", 500)).toBe("9");
  });
  it("formats negative sub-unit values without losing the sign", () => {
    expect(formatMoney("-50")).toContain("−");
    expect(formatMoney("-50")).toContain("0.50");
  });
});
