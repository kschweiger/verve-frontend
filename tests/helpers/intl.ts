// The runtime's ICU data determines the narrow unit labels and their spacing.
export function germanTimeUnit(
  value: number,
  unit: 'hour' | 'minute' | 'second',
  minimumIntegerDigits = 1
): string {
  return new Intl.NumberFormat('de', {
    style: 'unit',
    unit,
    unitDisplay: 'narrow',
    minimumIntegerDigits,
  }).format(value);
}
