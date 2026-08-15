// Pure layout math for composing a set of same-size labeled image cells (e.g. one thumbnail
// per deficiency, or one per severity) into a single grid, so a "download comparison grid"
// button can draw them onto one offscreen canvas instead of leaving each thumbnail as a
// separate on-screen figure with nothing that stitches them together. Kept DOM-free like
// palette.js and cvd.js so the arrangement can be tested without a canvas.

/**
 * How many columns a grid of `cellCount` cells should use: a roughly square arrangement, so a
 * downloaded comparison reads as a grid rather than one very wide (or very tall) strip. 4 cells
 * (compare-all's four deficiencies) become 2x2; the default 5-severity sweep becomes 3 columns
 * with the last row's final cell left empty.
 *
 * @param {number} cellCount
 */
export function gridColumns(cellCount) {
  const count = Number.isFinite(cellCount) ? Math.max(0, Math.floor(cellCount)) : 0;
  if (count === 0) return 0;
  return Math.ceil(Math.sqrt(count));
}

/**
 * Lays out `cellCount` same-size cells (each `cellWidth` x `cellHeight`, plus room below for a
 * text label) into a grid, row-major (left-to-right, then top-to-bottom) — the same order
 * `compareAllDeficiencies`/`sweepSeverities` already return their results in, so callers can
 * zip `positions[i]` directly against `results[i]` without re-sorting anything.
 *
 * @param {number} cellCount
 * @param {number} cellWidth
 * @param {number} cellHeight
 * @param {{gap?: number, labelHeight?: number, columns?: number}} [options]
 *   `columns` overrides the automatic roughly-square column count when supplied.
 * @returns {{
 *   columns: number,
 *   rows: number,
 *   width: number,
 *   height: number,
 *   positions: {x: number, y: number, labelY: number}[]
 * }} overall canvas size and, per cell, the image's top-left corner (`x`, `y`) and the
 *   vertical center (`labelY`) a caption below it should be drawn at
 */
export function computeGridLayout(cellCount, cellWidth, cellHeight, options = {}) {
  const count = Number.isFinite(cellCount) ? Math.max(0, Math.floor(cellCount)) : 0;
  const gap = options.gap ?? 12;
  const labelHeight = options.labelHeight ?? 24;
  const columns = options.columns ?? gridColumns(count);
  const rows = count > 0 && columns > 0 ? Math.ceil(count / columns) : 0;

  const cellOuterWidth = cellWidth + gap;
  const cellOuterHeight = cellHeight + labelHeight + gap;

  const positions = [];
  for (let i = 0; i < count; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const x = gap + col * cellOuterWidth;
    const y = gap + row * cellOuterHeight;
    positions.push({ x, y, labelY: y + cellHeight + labelHeight / 2 });
  }

  return {
    columns,
    rows,
    width: columns > 0 ? gap + columns * cellOuterWidth : 0,
    height: rows > 0 ? gap + rows * cellOuterHeight : 0,
    positions,
  };
}
