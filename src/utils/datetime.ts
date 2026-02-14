/**
 * Parses ISO 8601 duration (e.g., PT1H30M) to seconds.
 * @param duration ISO 8601 duration string
 * @returns Total seconds
 */
export function parseISODuration(duration: string): number {
  if (!duration) return 0;

  // Parse PT format (e.g., "PT2H", "PT3H21M8S")
  const matches = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
  if (!matches) return 0;

  const hours = parseInt(matches[1] || '0', 10);
  const minutes = parseInt(matches[2] || '0', 10);
  const seconds = parseFloat(matches[3] || '0');

  return hours * 3600 + minutes * 60 + seconds;
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
