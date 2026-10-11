import { isSupportedTimezone } from '../services/timezones';

function formatter(timezone: string): Intl.DateTimeFormat {
  if (!isSupportedTimezone(timezone)) throw new Error('Select a supported timezone.');
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      calendar: 'gregory',
      numberingSystem: 'latn',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
  } catch (error) {
    if (error instanceof RangeError) {
      throw new Error(`Your browser cannot process ${timezone}. Select another timezone.`);
    }
    throw error;
  }
}

function localParts(format: Intl.DateTimeFormat, instant: number): string {
  const parts = Object.fromEntries(
    format.formatToParts(instant).map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}

export function currentActivityLocalTime(timezone: string, now = new Date()): string {
  return localParts(formatter(timezone), now.getTime()).slice(0, 16);
}

export function localActivityTimeToInstant(local: string, timezone: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(local)) {
    throw new Error('Enter a valid date and time.');
  }
  const normalized = local.length === 16 ? `${local}:00` : local;
  const wallTime = Date.parse(`${normalized}Z`);
  if (!Number.isFinite(wallTime) || new Date(wallTime).toISOString().slice(0, 19) !== normalized) {
    throw new Error('Enter a valid date and time.');
  }
  const format = formatter(timezone);
  const offsets = new Set<number>();
  // Sample both sides of nearby transitions, including half-hour and skipped-day changes.
  for (let hours = -48; hours <= 48; hours += 6) {
    const sample = wallTime + hours * 3_600_000;
    offsets.add(Date.parse(`${localParts(format, sample)}Z`) - sample);
  }
  const candidates = [...offsets].map((offset) => {
    const instant = wallTime - offset;
    return { instant, difference: Date.parse(`${localParts(format, instant)}Z`) - wallTime };
  });
  const matches = candidates
    .filter((candidate) => candidate.difference === 0)
    .sort((a, b) => a.instant - b.instant);
  // Compatible disambiguation: first occurrence on overlap; shift forward across a gap.
  const selected =
    matches[0] ??
    candidates
      .filter((candidate) => candidate.difference > 0)
      .sort((a, b) => a.difference - b.difference)[0];
  if (!selected) throw new Error('Unable to interpret this date in the selected timezone.');
  return new Date(selected.instant).toISOString();
}
