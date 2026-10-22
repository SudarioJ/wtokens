export function formatMoney(
  minor: string,
  currency = "USD",
  exponent = 2,
): string {
  if (
    !/^-?\d{1,19}$/.test(minor) ||
    !/^[A-Z]{3}$/.test(currency) ||
    !Number.isInteger(exponent) ||
    exponent < 0 ||
    exponent > 3
  )
    throw new Error("Invalid money");
  const value = BigInt(minor),
    absolute = value < 0n ? -value : value;
  const base = 10n ** BigInt(exponent);
  const fraction = (absolute % base).toString().padStart(exponent, "0");
  const parts = new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency,
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  }).formatToParts(absolute / base);
  return (
    (value < 0n ? "−" : "") +
    parts
      .map((part) => (part.type === "fraction" ? fraction : part.value))
      .join("")
  );
}

export function inputToMinor(value: string, exponent: number): string {
  if (
    !Number.isInteger(exponent) ||
    exponent < 0 ||
    exponent > 3 ||
    !new RegExp(`^\\d{1,12}(?:[.,]\\d{1,${Math.max(1, exponent)}})?$`).test(
      value,
    )
  )
    throw new Error("Introduce un importe válido.");
  const [whole = "", fraction = ""] = value.replace(",", ".").split(".");
  if (fraction.length > exponent)
    throw new Error("Demasiados decimales para esta moneda.");
  const minor =
    BigInt(whole) * 10n ** BigInt(exponent) +
    BigInt(fraction.padEnd(exponent, "0") || "0");
  if (minor <= 0n || minor > 9999999999999999n)
    throw new Error(
      "El importe debe ser mayor que cero y estar dentro del límite.",
    );
  return minor.toString();
}

export function prize(stake: string, bps: number): string {
  if (
    !/^\d{1,16}$/.test(stake) ||
    !Number.isInteger(bps) ||
    bps < 0 ||
    bps > 10000
  )
    throw new Error("Invalid prize");
  const pot = BigInt(stake) * 2n;
  const fee = (pot * BigInt(bps) + 5000n) / 10000n;
  return (pot - fee).toString();
}
