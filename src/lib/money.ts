/** Marketplace-wide money settings. Amounts are stored and shown in INR. */
export const DEFAULT_CURRENCY = "INR";
export const CURRENCY_LOCALE = "en-IN";

/** The marketplace is INR-only; any other code falls back to INR. */
const SUPPORTED_CURRENCIES = new Set<string>([DEFAULT_CURRENCY]);

function resolveCurrency(currency: string): string {
  const code = typeof currency === "string" ? currency.trim().toUpperCase() : "";
  return SUPPORTED_CURRENCIES.has(code) ? code : DEFAULT_CURRENCY;
}

export function formatMoney(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
): string {
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: "currency",
    currency: resolveCurrency(currency),
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatMoneyRange(
  min: number,
  max: number,
  currency: string = DEFAULT_CURRENCY,
): string {
  return `${formatMoney(min, currency)} – ${formatMoney(max, currency)}`;
}
