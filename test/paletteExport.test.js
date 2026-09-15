import test from "node:test";
import assert from "node:assert/strict";
import { paletteToCssVariables } from "../src/paletteExport.js";

test("paletteToCssVariables wraps declarations in a :root block", () => {
  const css = paletteToCssVariables([{ hex: "#ff0000" }, { hex: "#00ff00" }]);
  assert.equal(css, ":root {\n  --chroma-1: #ff0000;\n  --chroma-2: #00ff00;\n}\n");
});

test("paletteToCssVariables numbers variables from 1, in palette order", () => {
  const css = paletteToCssVariables([{ hex: "#111111" }, { hex: "#222222" }, { hex: "#333333" }]);
  assert.ok(css.includes("--chroma-1: #111111;"));
  assert.ok(css.includes("--chroma-2: #222222;"));
  assert.ok(css.includes("--chroma-3: #333333;"));
});

test("paletteToCssVariables accepts a custom variable name prefix", () => {
  const css = paletteToCssVariables([{ hex: "#abcdef" }], "brand");
  assert.ok(css.includes("--brand-1: #abcdef;"));
  assert.ok(!css.includes("--chroma-"));
});

test("paletteToCssVariables returns a valid empty block for an empty palette", () => {
  assert.equal(paletteToCssVariables([]), ":root {\n}\n");
});

test("paletteToCssVariables ignores any fields on each color besides hex", () => {
  const css = paletteToCssVariables([{ r: 255, g: 0, b: 0, hex: "#ff0000" }]);
  assert.equal(css, ":root {\n  --chroma-1: #ff0000;\n}\n");
});
