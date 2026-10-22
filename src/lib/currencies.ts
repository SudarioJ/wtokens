import type { Asset } from "./contracts";

export const regionalCurrencies = [
  {
    code: "PEN",
    country: "Perú",
    name: "Sol",
    symbol: "S/",
    exponent: 2,
    locale: "es-PE",
  },
  {
    code: "ARS",
    country: "Argentina",
    name: "Peso argentino",
    symbol: "$",
    exponent: 2,
    locale: "es-AR",
  },
  {
    code: "CLP",
    country: "Chile",
    name: "Peso chileno",
    symbol: "$",
    exponent: 0,
    locale: "es-CL",
  },
  {
    code: "BOB",
    country: "Bolivia",
    name: "Boliviano",
    symbol: "Bs",
    exponent: 2,
    locale: "es-BO",
  },
  {
    code: "PYG",
    country: "Paraguay",
    name: "Guaraní",
    symbol: "₲",
    exponent: 0,
    locale: "es-PY",
  },
  {
    code: "UYU",
    country: "Uruguay",
    name: "Peso uruguayo",
    symbol: "$",
    exponent: 2,
    locale: "es-UY",
  },
  {
    code: "BRL",
    country: "Brasil",
    name: "Real brasileño",
    symbol: "R$",
    exponent: 2,
    locale: "pt-BR",
  },
] as const;

export function displayCurrencies(assets: Asset[]) {
  return regionalCurrencies.map((currency) => ({
    ...currency,
    settlement_enabled:
      assets.find((asset) => asset.code === currency.code)
        ?.settlement_enabled ?? false,
  }));
}

export function initialCurrency(): string {
  try {
    const saved = localStorage.getItem("wtokens.currency");
    if (regionalCurrencies.some((currency) => currency.code === saved))
      return saved!;
  } catch {
    /* Currency preference is optional when storage is unavailable. */
  }
  return "PEN";
}
