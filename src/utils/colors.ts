// The Verve Palette Definition
export const VERVE_COLORS = {
  light: '#EFF3DB',   // hellgrün
  medium: '#CDD4A4',  // mittelgrün
  neon: '#9EFF00',    // neongrün
  brown: '#6D5239',   // braun
  orange: '#F57A07',  // orange
  dark: '#778332',    // dunkelgrün

  // Standard mappings for charts
  chartBlue: '#3b82f6',
  chartRed: '#ef4444',
  chartPurple: '#8b5cf6',
  chartGray: '#9ca3af',
};

// Distinct palette for Categories (using Chart colors + Verve accents)
export const CATEGORY_PALETTE = [
  VERVE_COLORS.orange,
  VERVE_COLORS.dark,
  VERVE_COLORS.brown,
  VERVE_COLORS.neon,
  VERVE_COLORS.chartBlue,
  VERVE_COLORS.chartRed,
  VERVE_COLORS.chartPurple,
  '#06b6d4',           // Cyan-500
  '#eab308',           // Yellow-500
  '#ec4899',           // Pink-500
];

export const UNCATEGORIZED_COLOR = '#9ca3af'; // Gray-400

/**
 * Returns a consistent color for a given ID.
 * Useful for mapping Category IDs to map markers or charts.
 */
export function getCategoryColor(id: number | null | undefined): string {
  if (id === null || id === undefined) {
    return UNCATEGORIZED_COLOR;
  }
  // Use modulo to cycle through the palette so it loops if we have many types
  return CATEGORY_PALETTE[id % CATEGORY_PALETTE.length];
}

/**
 * Converts a Hex color (#RRGGBB) to an RGBA string.
 * @param hex The hex code (e.g. #778332)
 * @param alpha The opacity (0 to 1)
 */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Keep legacy exports if used elsewhere, or update them to use the palette
export const CHART_COLORS = [
  VERVE_COLORS.orange,
  VERVE_COLORS.dark,
  VERVE_COLORS.brown,
  VERVE_COLORS.neon,
  VERVE_COLORS.chartBlue,
  VERVE_COLORS.chartRed,
  VERVE_COLORS.chartPurple
];
export const CHART_HOVER_COLORS = [
  '#EA580C', // Darker Orange
  '#556B2F', // Darker Green
  '#4E3B29', // Darker Brown
  '#7ACC00', // Darker Neon
  '#2563eb', // Blue 600
  '#dc2626', // Red 600
  '#7c3aed', // Purple 600
];

export const RANK_COLORS = {
  1: '#F59E0B',        // Gold (Amber-500 placeholder)
  2: '#9CA3AF',        // Silver (Gray-400 placeholder)
  3: VERVE_COLORS.orange // Bronze (Using Verve Orange)
};
