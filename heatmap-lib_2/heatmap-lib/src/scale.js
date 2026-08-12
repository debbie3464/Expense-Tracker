/**
 * Clamp a number between a min and max.
 */
function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Parse a hex color string (#rgb or #rrggbb) into [r, g, b].
 */
function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h.split('').map((c) => c + c).join('');
  }
  const num = parseInt(h, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Linearly interpolate between two hex colors at position t (0–1).
 */
function interpolateColor(hexLow, hexHigh, t) {
  const [r1, g1, b1] = hexToRgb(hexLow);
  const [r2, g2, b2] = hexToRgb(hexHigh);

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Create a color-scale function for a given [min, max] data range.
 *
 * @param {[string, string]} colors - [lowColor, highColor] as hex strings
 * @param {number} min - minimum data value
 * @param {number} max - maximum data value
 * @returns {(value: number) => string} function mapping a value to an rgb() string
 */
export function createColorScale([lowColor, highColor], min, max) {
  // Guard against a degenerate range (min === max) to avoid divide-by-zero.
  const range = max - min || 1;

  return function getColor(value) {
    const t = clamp((value - min) / range, 0, 1);
    return interpolateColor(lowColor, highColor, t);
  };
}
