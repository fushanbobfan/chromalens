// Pure formatting for exporting a palette as CSS custom properties, kept DOM-free like the
// rest of this project's color modules (paletteGenerator.js, paletteCheck.js) so the
// formatting can be tested without a browser.

/**
 * Formats a palette as a `:root { --prefix-N: #hex; }` block of CSS custom properties, one
 * per color in the order given — for pasting a generated (or checked) palette straight into a
 * stylesheet instead of retyping hex codes by hand.
 *
 * @param {{hex:string}[]} palette
 * @param {string} prefix names the variables (`--chroma-1`, `--chroma-2`, ... by default)
 * @returns {string} a complete, syntactically valid `:root { ... }` block, even for an empty
 *   palette, ending with a trailing newline
 */
export function paletteToCssVariables(palette, prefix = "chroma") {
  const declarations = palette.map((color, i) => `  --${prefix}-${i + 1}: ${color.hex};`);
  return [":root {", ...declarations, "}"].join("\n") + "\n";
}
