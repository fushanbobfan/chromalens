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
