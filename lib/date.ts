const DAY_MS = 24 * 60 * 60 * 1000;

/** yyyy-mm-dd in local time. */
export function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): string {
  return toKey(new Date());
}

export function addDays(key: string, days: number): string {
  return toKey(new Date(fromKey(key).getTime() + days * DAY_MS));
}

export function offsetKey(days: number): string {
  return toKey(new Date(Date.now() + days * DAY_MS));
}

/** Monday-based start of week for the given key. */
export function startOfWeek(key: string): string {
  const d = fromKey(key);
  const dow = (d.getDay() + 6) % 7; // 0 = Monday
  return addDays(key, -dow);
}

export function weekDays(key: string): string[] {
  const start = startOfWeek(key);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function startOfMonth(key: string): string {
  const d = fromKey(key);
  return toKey(new Date(d.getFullYear(), d.getMonth(), 1));
}

/** 6-week grid (Mon-first) covering the month that contains `key`. */
export function monthGrid(key: string): string[] {
  const first = fromKey(startOfMonth(key));
  const gridStart = startOfWeek(toKey(first));
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTH = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function weekdayShort(key: string): string {
  return WEEKDAY[fromKey(key).getDay()];
}

export function dayNum(key: string): number {
  return fromKey(key).getDate();
}

export function monthName(key: string): string {
  return MONTH[fromKey(key).getMonth()];
}

export function monthYearLabel(key: string): string {
  const d = fromKey(key);
  return `${MONTH[d.getMonth()]} ${d.getFullYear()}`;
}

/** e.g. "Wednesday, Aug 19" */
export function longDayLabel(key: string): string {
  const d = fromKey(key);
  return `${WEEKDAY_LONG[d.getDay()]}, ${MONTH[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

/** e.g. "MONDAY, AUGUST 17" */
export function agendaDayLabel(key: string): string {
  const d = fromKey(key);
  return `${WEEKDAY_LONG[d.getDay()]}, ${MONTH[d.getMonth()]} ${d.getDate()}`.toUpperCase();
}

export function isSameMonth(a: string, b: string): boolean {
  const da = fromKey(a);
  const db = fromKey(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth();
}

export function relativeLabel(key: string): string {
  const diff = Math.round(
    (fromKey(key).getTime() - fromKey(todayKey()).getTime()) / DAY_MS
  );
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  return longDayLabel(key);
}

/** "3h ago", "yesterday", "5d ago" from an ISO timestamp. */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / (60 * 60 * 1000));
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  return `${w}w ago`;
}
