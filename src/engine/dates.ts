/** Local-date helpers for the daily puzzle. All "days" are local calendar days. */

/** Launch day: puzzle #1. */
export const LAUNCH_DATE_ISO = '2026-10-15';

const pad = (n: number) => (n < 10 ? '0' + n : String(n));

/** Local calendar date as YYYY-MM-DD. */
export function localDateISO(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parse YYYY-MM-DD into a UTC-midnight timestamp (DST-proof day arithmetic). */
export function isoToUtcDay(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
}

export function utcDayToISO(day: number): string {
  const d = new Date(day * 86400000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Whole days b - a (both ISO dates). */
export function daysBetween(a: string, b: string): number {
  return Math.round(isoToUtcDay(b) - isoToUtcDay(a));
}

export function addDays(iso: string, n: number): string {
  return utcDayToISO(isoToUtcDay(iso) + n);
}

/** Puzzle number for a local date (launch day = #1, never below 1). */
export function puzzleNumber(iso: string): number {
  return Math.max(1, daysBetween(LAUNCH_DATE_ISO, iso) + 1);
}

/** 0 = Sunday … 6 = Saturday, computed from the ISO date itself (timezone-free). */
export function weekdayOf(iso: string): number {
  return new Date(isoToUtcDay(iso) * 86400000).getUTCDay();
}
