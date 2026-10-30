const HOUR_MS = 60 * 60 * 1000;

function assertInterval(everyHours: number): void {
  if (!Number.isFinite(everyHours) || everyHours <= 0) {
    throw new RangeError(`everyHours must be a positive number, got ${everyHours}`);
  }
}

export function nextRunAt(lastRunAt: string | null, everyHours: number, now: string): string {
  assertInterval(everyHours);
  if (lastRunAt === null) return now;
  return new Date(Date.parse(lastRunAt) + everyHours * HOUR_MS).toISOString();
}

export function isDue(lastRunAt: string | null, everyHours: number, now: string): boolean {
  return Date.parse(now) >= Date.parse(nextRunAt(lastRunAt, everyHours, now));
}
