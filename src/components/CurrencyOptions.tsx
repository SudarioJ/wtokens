import type { Asset } from "../lib/contracts";
import { displayCurrencies } from "../lib/currencies";

export function CurrencyOptions({ assets }: { assets: Asset[] }) {
  return displayCurrencies(assets).map((currency) => (
    <option key={currency.code} value={currency.code}>
      {currency.code} · {currency.country}
    </option>
  ));
}
