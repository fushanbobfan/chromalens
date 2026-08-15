import test from "node:test";
import assert from "node:assert/strict";
import { gridColumns, computeGridLayout } from "../src/gridLayout.js";

test("gridColumns picks a roughly square arrangement", () => {
  assert.equal(gridColumns(4), 2);
  assert.equal(gridColumns(9), 3);
  assert.equal(gridColumns(1), 1);
});

test("gridColumns rounds up for counts that aren't a perfect square", () => {
  // compare-all's four deficiencies -> 2 columns; the default five-severity sweep -> 3.
  assert.equal(gridColumns(4), 2);
  assert.equal(gridColumns(5), 3);
  assert.equal(gridColumns(7), 3);
});

test("gridColumns treats zero, negative, and non-finite counts as zero columns", () => {
  assert.equal(gridColumns(0), 0);
  assert.equal(gridColumns(-3), 0);
  assert.equal(gridColumns(NaN), 0);
});

test("computeGridLayout returns one position per cell, in row-major order", () => {
  const layout = computeGridLayout(4, 100, 50, { columns: 2, gap: 10, labelHeight: 20 });
  assert.equal(layout.positions.length, 4);
  assert.equal(layout.columns, 2);
  assert.equal(layout.rows, 2);

  // Row 0: cells 0 and 1 side by side, same y.
  assert.equal(layout.positions[0].y, layout.positions[1].y);
  assert.ok(layout.positions[1].x > layout.positions[0].x);

  // Row 1: cells 2 and 3 below row 0, cell 2 back at the left column's x.
  assert.equal(layout.positions[2].x, layout.positions[0].x);
  assert.ok(layout.positions[2].y > layout.positions[0].y);
});

test("computeGridLayout spaces cells by exactly cellWidth/cellHeight plus gap and label height", () => {
  const gap = 10;
  const labelHeight = 20;
  const cellWidth = 100;
  const cellHeight = 50;
  const layout = computeGridLayout(4, cellWidth, cellHeight, { columns: 2, gap, labelHeight });

  assert.equal(layout.positions[1].x - layout.positions[0].x, cellWidth + gap);
  assert.equal(layout.positions[2].y - layout.positions[0].y, cellHeight + labelHeight + gap);
});

test("computeGridLayout's labelY sits centered in the reserved label strip below the image", () => {
  const gap = 10;
  const labelHeight = 20;
  const cellHeight = 50;
  const layout = computeGridLayout(1, 100, cellHeight, { columns: 1, gap, labelHeight });
  const cell = layout.positions[0];
  assert.equal(cell.labelY, cell.y + cellHeight + labelHeight / 2);
});

test("computeGridLayout's overall size fits every column and row with a trailing gap", () => {
  const gap = 10;
  const labelHeight = 20;
  const cellWidth = 100;
  const cellHeight = 50;
  const layout = computeGridLayout(4, cellWidth, cellHeight, { columns: 2, gap, labelHeight });

  assert.equal(layout.width, gap + 2 * (cellWidth + gap));
  assert.equal(layout.height, gap + 2 * (cellHeight + labelHeight + gap));
});

test("computeGridLayout defaults to a roughly square column count when none is given", () => {
  const layout = computeGridLayout(9, 10, 10);
  assert.equal(layout.columns, 3);
  assert.equal(layout.rows, 3);
});

test("computeGridLayout leaves the last row short rather than padding it, for a non-perfect-square count", () => {
  const layout = computeGridLayout(5, 10, 10, { columns: 3 });
  assert.equal(layout.rows, 2);
  assert.equal(layout.positions.length, 5);
  // Row 1 (the second, shorter row) only has cells at columns 0 and 1.
  const row1 = layout.positions.slice(3);
  assert.equal(row1.length, 2);
});

test("computeGridLayout returns an empty layout for zero cells", () => {
  const layout = computeGridLayout(0, 100, 50);
  assert.equal(layout.positions.length, 0);
  assert.equal(layout.width, 0);
  assert.equal(layout.height, 0);
});

test("computeGridLayout handles a single cell as a 1x1 grid", () => {
  const layout = computeGridLayout(1, 100, 50, { gap: 10, labelHeight: 20 });
  assert.equal(layout.columns, 1);
  assert.equal(layout.rows, 1);
  assert.deepEqual(layout.positions[0], { x: 10, y: 10, labelY: 10 + 50 + 10 });
});
