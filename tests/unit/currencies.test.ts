import { afterEach, describe, expect, it, vi } from "vitest";
import {
  displayCurrencies,
  initialCurrency,
  regionalCurrencies,
} from "../../src/lib/currencies";
import { formatMoney, inputToMinor } from "../../src/lib/money";

afterEach(() => vi.unstubAllGlobals());
describe("regional currency catalog", () => {
  it("shows exactly the seven requested countries, including when the API is offline", () => {
    expect(displayCurrencies([]).map((currency) => currency.code)).toEqual([
      "PEN",
      "ARS",
      "CLP",
      "BOB",
      "PYG",
      "UYU",
      "BRL",
    ]);
    expect(
      displayCurrencies([]).every((currency) => !currency.settlement_enabled),
    ).toBe(true);
  });
  it.each(["CLP", "PYG"])("keeps %s in whole units", (code) => {
    const currency = regionalCurrencies.find((item) => item.code === code)!;
    expect(currency.exponent).toBe(0);
    expect(inputToMinor("12345", currency.exponent)).toBe("12345");
    expect(
      formatMoney("12345", code, currency.exponent).replace(/\D/g, ""),
    ).toBe("12345");
    expect(() => inputToMinor("1.25", currency.exponent)).toThrow();
  });
  it("uses country-appropriate separators without converting amounts", () => {
    expect(formatMoney("1001", "PEN", 2)).toContain("10.01");
    expect(formatMoney("1001", "ARS", 2)).toContain("10,01");
    expect(formatMoney("1001", "BRL", 2)).toContain("10,01");
  });
  it("starts with Peru and accepts only a supported saved preference", () => {
    vi.stubGlobal("localStorage", { getItem: () => "USD" });
    expect(initialCurrency()).toBe("PEN");
    vi.stubGlobal("localStorage", { getItem: () => "BRL" });
    expect(initialCurrency()).toBe("BRL");
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("Storage blocked");
      },
    });
    expect(initialCurrency()).toBe("PEN");
  });
});
