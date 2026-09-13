// WCAG 2.x contrast ratio: a different question from the color-vision-deficiency confusion the
// rest of this project scores. Confusion score and palette checking ask "how similar do these
// colors become for someone with a CVD," using a straight-line RGB distance; contrast ratio
// instead asks "is this foreground legible against this background for anyone," a luminance
// question that CVD simulation doesn't answer on its own — a pair can simulate as visually
// similar under a deficiency while still differing sharply in luminance, or the reverse.
// Like the rest of the color modules, this one has no DOM dependency, so the math is unit-tested
// without a browser.

const SRGB_LINEARIZE_THRESHOLD = 0.03928;

function linearizeChannel(value) {
  const c = value / 255;
  return c <= SRGB_LINEARIZE_THRESHOLD ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/**
 * WCAG relative luminance of an `{r, g, b}` color (0-255 channels), per the 2.x definition:
 * each channel is linearized out of sRGB's gamma encoding, then combined with the same
 * green-dominant perceptual weights (0.2126/0.7152/0.0722) cvd.js's achromatopsia conversion
 * uses for the same reason — the eye's luminance response depends far more on green light than
 * red or blue. Ranges from 0 (black) to 1 (white).
 */
export function relativeLuminance({ r, g, b }) {
  return 0.2126 * linearizeChannel(r) + 0.7152 * linearizeChannel(g) + 0.0722 * linearizeChannel(b);
}

/**
 * WCAG contrast ratio between two colors: `(lighter + 0.05) / (darker + 0.05)` in relative
 * luminance, so the result is always >= 1 (21 at most, for pure black against pure white)
 * regardless of which color is passed first.
 */
export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

// The four standard WCAG 2.x text-contrast thresholds. "Large" text is >=18pt (24px) regular
// weight or >=14pt (18.67px) bold — easier to read at lower contrast than smaller body text, so
// it gets a more permissive floor at both conformance levels.
export const WCAG_THRESHOLDS = {
  aaNormal: 4.5,
  aaLarge: 3,
  aaaNormal: 7,
  aaaLarge: 4.5,
};

/**
 * Which of the four standard WCAG 2.x thresholds a contrast ratio clears.
 * @returns {{ ratio: number, aaNormal: boolean, aaLarge: boolean, aaaNormal: boolean, aaaLarge: boolean }}
 */
export function wcagRating(ratio) {
  return {
    ratio,
    aaNormal: ratio >= WCAG_THRESHOLDS.aaNormal,
    aaLarge: ratio >= WCAG_THRESHOLDS.aaLarge,
    aaaNormal: ratio >= WCAG_THRESHOLDS.aaaNormal,
    aaaLarge: ratio >= WCAG_THRESHOLDS.aaaLarge,
  };
}
