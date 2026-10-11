/**
 * Parses ISO 8601 duration (e.g., PT1H30M) to seconds.
 * @param duration ISO 8601 duration string
 * @returns Total seconds
 */
export function parseISODuration(duration: string): number {
  if (!duration) return 0;

  // Timedelta responses may include days, e.g. P1DT2H30M.
  const matches = duration.match(/^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/);
  if (!matches) return 0;

  const days = Number(matches[1] || 0);
  const hours = Number(matches[2] || 0);
  const minutes = Number(matches[3] || 0);
  const seconds = Number(matches[4] || 0);

  return days * 86400 + hours * 3600 + minutes * 60 + seconds;
}

/**
 * Formats seconds into "Xh Ym" or "Ym Zs" string.
 * @param seconds Total seconds
 * @returns Formatted string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${secs}s`;
}

/**
 * Converts hours, minutes, and seconds to ISO 8601 duration string (e.g. PT1H30M).
 * @param h Hours
 * @param m Minutes
 * @param s Seconds
 * @returns ISO 8601 Duration String
 */
export function toISODuration(h: number, m: number, s: number): string {
  let iso = 'PT';
  if (h > 0) iso += `${h}H`;
  if (m > 0) iso += `${m}M`;
  if (s > 0 || iso === 'PT') iso += `${s}S`;
  return iso;
}

/** Accept API instants only: a calendar date and an explicit UTC/offset suffix. */
export function isAwareTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:[Zz]|([+-])(\d{2}):(\d{2}))$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  return daysInMonth !== undefined && day >= 1 && day <= daysInMonth &&
    Number(match[4]) < 24 && Number(match[5]) < 60 && Number(match[6]) < 60 &&
    (match[7] === undefined || (Number(match[8]) < 24 && Number(match[9]) < 60)) &&
    Number.isFinite(Date.parse(value));
}

export interface FormattedActivityTimestamp {
  text: string;
  isLocalTimeAvailable: boolean;
}

export function formatActivityTimestamp(
  timestamp: string,
  timezone: string,
  options: Intl.DateTimeFormatOptions = {},
  locale?: string | string[]
): FormattedActivityTimestamp {
  const unavailable = {
    text: `Local time unavailable · ${timestamp} · ${timezone}`,
    isLocalTimeAvailable: false,
  };
  if (!isAwareTimestamp(timestamp)) return unavailable;
  try {
    return {
      text: new Intl.DateTimeFormat(locale, { ...options, timeZone: timezone }).format(new Date(timestamp)),
      isLocalTimeAvailable: true,
    };
  } catch (error: unknown) {
    if (error instanceof RangeError) return unavailable;
    throw error;
  }
}

/** Elapsed time is measured between instants, never between displayed wall times. */
export function elapsedSecondsBetweenInstants(start: string, end: string): number | null {
  if (!isAwareTimestamp(start) || !isAwareTimestamp(end)) return null;
  return Math.max(0, (Date.parse(end) - Date.parse(start)) / 1000);
}
