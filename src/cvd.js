// Approximate color-vision-deficiency simulation, kept free of any DOM or canvas dependency so
// individual color transforms can be tested with plain numbers. The three dichromacy matrices
// below are the widely used approximation published for simulating protanopia, deuteranopia,
// and tritanopia (the same family of matrices behind, e.g., browser devtools' "emulate vision
// deficiencies" tooling) — not colorimetrically exact, but a fast, well-established
// approximation appropriate for an educational tool. Each row sums to exactly 1, so a neutral
// gray always maps to itself: color vision deficiencies affect hue discrimination, not overall
// brightness.

export function clamp255(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/** Straight-line RGB distance between two `{r, g, b}` colors — not perceptually uniform, but
 * good enough to compare "how much closer did simulating this deficiency bring these two
 * colors" before and after, which only needs a consistent yardstick, not a perfect one. */
export function colorDistance(a, b) {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

/** Parses a `#rrggbb` string into an `{r, g, b}` triple. */
export function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

const DICHROMACY_MATRICES = {
  protanopia: [
    [0.567, 0.433, 0.0],
    [0.558, 0.442, 0.0],
    [0.0, 0.242, 0.758],
  ],
  deuteranopia: [
    [0.625, 0.375, 0.0],
    [0.7, 0.3, 0.0],
    [0.0, 0.3, 0.7],
  ],
  tritanopia: [
    [0.95, 0.05, 0.0],
    [0.0, 0.433, 0.567],
    [0.0, 0.475, 0.525],
  ],
};

export function listDichromacies() {
  return Object.keys(DICHROMACY_MATRICES);
}

// Redistributes the color information a dichromacy simulation discards into channels that
// deficiency doesn't affect — the classic "daltonize" error-shift approach (Fidaner, Lin &
// Ozguven 2005), adapted to work directly on the RGB matrices above instead of a full LMS
// conversion. Protanopia and deuteranopia both confuse red/green, so their lost signal is
// pushed into blue (and green, for what red alone couldn't carry); tritanopia confuses
// blue/yellow, so its lost signal is pushed into red and green instead.
const ERROR_SHIFT_MATRICES = {
  protanopia: [
    [0.0, 0.0, 0.0],
    [0.7, 1.0, 0.0],
    [0.7, 0.0, 1.0],
  ],
  deuteranopia: [
    [0.0, 0.0, 0.0],
    [0.7, 1.0, 0.0],
    [0.7, 0.0, 1.0],
  ],
  tritanopia: [
    [1.0, 0.0, 0.0],
    [0.0, 1.0, 0.0],
    [-0.7, 0.7, 1.0],
  ],
};

function applyMatrix(matrix, r, g, b) {
  return {
    r: matrix[0][0] * r + matrix[0][1] * g + matrix[0][2] * b,
    g: matrix[1][0] * r + matrix[1][1] * g + matrix[1][2] * b,
    b: matrix[2][0] * r + matrix[2][1] * g + matrix[2][2] * b,
  };
}

/**
 * Simulates one of the three dichromacies at a given `severity` (0 = unaffected original
 * color, 1 = full dichromacy), linearly interpolating between the two. Severity between 0 and
 * 1 is a coarse but standard way to approximate anomalous trichromacy (partial deficiency)
 * without a full physiological model of cone sensitivity shift.
 * @param {"protanopia"|"deuteranopia"|"tritanopia"} name
 */
export function simulateDichromacy(name, r, g, b, severity = 1) {
  const matrix = DICHROMACY_MATRICES[name];
  if (!matrix) throw new Error(`Unknown dichromacy: "${name}"`);
  const full = applyMatrix(matrix, r, g, b);
  return {
    r: clamp255(r + (full.r - r) * severity),
    g: clamp255(g + (full.g - g) * severity),
    b: clamp255(b + (full.b - b) * severity),
  };
}

/**
 * Recolors a color to make it more distinguishable under one of the three dichromacies,
 * instead of simulating what that deficiency looks like. Computes what the given color would
 * simulate to, treats the difference from the original as "lost" information, and redistributes
 * that lost information into channels the deficiency doesn't collapse — approximating the
 * classic daltonize algorithm without a full LMS color-space conversion. There's no
 * daltonization equivalent for achromatopsia: full monochromacy discards hue information
 * entirely, leaving no unaffected channel to redistribute it into.
 *
 * This is a per-pixel heuristic, not a guarantee — the 0-255 clamp can absorb the correction
 * entirely for colors already near black, white, or a channel extreme, so some pairs see little
 * or no improvement even though most see a clear one.
 * @param {"protanopia"|"deuteranopia"|"tritanopia"} name
 */
export function daltonize(name, r, g, b, severity = 1) {
  const shift = ERROR_SHIFT_MATRICES[name];
  if (!shift) throw new Error(`Unknown dichromacy: "${name}"`);
  const simulated = simulateDichromacy(name, r, g, b, severity);
  const error = { r: r - simulated.r, g: g - simulated.g, b: b - simulated.b };
  const correction = applyMatrix(shift, error.r, error.g, error.b);
  return {
    r: clamp255(r + correction.r),
    g: clamp255(g + correction.g),
    b: clamp255(b + correction.b),
  };
}

/**
 * Simulates full monochromacy (achromatopsia) by converting toward grayscale using
 * perceptual luma weights (ITU-R BT.709), at a given severity.
 */
export function simulateAchromatopsia(r, g, b, severity = 1) {
  const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return {
    r: clamp255(r + (gray - r) * severity),
    g: clamp255(g + (gray - g) * severity),
    b: clamp255(b + (gray - b) * severity),
  };
}
