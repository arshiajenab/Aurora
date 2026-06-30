/**
 * Pure formatting helpers. No side effects, no dependencies — easy to unit
 * test and tree-shake.
 */

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat("en-US");

/** Format a number as USD currency, e.g. 1299 -> "$1,299.00". */
export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

/** Compact currency for dashboards, e.g. 1_200_000 -> "$1.2M". */
export function formatCompactCurrency(value: number): string {
  return compactCurrencyFormatter.format(value);
}

/** Plain number grouping, e.g. 12000 -> "12,000". */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** Percentage with one decimal, e.g. 12.5 -> "12.5%". */
export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}

/** Relative "time ago" string without pulling a dependency. */
export function timeAgo(date: string | number | Date): string {
  const then = new Date(date).getTime();
  const now = Date.now();
  const seconds = Math.round((now - then) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  const months = Math.round(days / 30);
  const years = Math.round(days / 365);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
}

/** Truncate text to a max length with an ellipsis. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

/** Title-case a slug, e.g. "home-decoration" -> "Home Decoration". */
export function titleCaseSlug(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Derive a stable, readable order id, e.g. "AUR-7F3K9". */
export function generateOrderId(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 5; i++) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `AUR-${id}`;
}

/** Clamp a number between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
