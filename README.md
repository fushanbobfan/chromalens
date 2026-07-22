# Chromalens

An interactive color-vision-deficiency simulator, built with plain HTML5 canvas and vanilla
JavaScript — no build step, no dependencies.

Upload an image (or use the built-in sample) and see it the way protanopia, deuteranopia,
tritanopia, or full color blindness would render it, at any severity from unaffected to full.

## Running it

Any static file server works, since the page is loaded as ES modules over HTTP (opening
`index.html` directly via `file://` will not load the modules). For example:

```bash
npx serve .
# or
python -m http.server 8000
```

Then open the printed URL in a browser.

## Controls

- **Color vision deficiency** — protanopia, deuteranopia, tritanopia (the three dichromacies),
  or achromatopsia (full color blindness).
- **Severity** — 0% (the original, unaffected image) to 100% (full deficiency), linearly
  interpolated.
- **Upload an image&hellip;** — process your own image. Everything happens in your browser;
  nothing is ever sent anywhere.
- **Use sample image** — reload the built-in sample: a full hue gradient plus swatch pairs
  people commonly confuse under each deficiency (reds and greens, blues and yellows).
- **Download simulated image** — save the currently displayed simulation as a PNG, named after
  the deficiency and severity that produced it.

## The simulation

[`src/cvd.js`](src/cvd.js) implements the color transforms as plain functions on `{r, g, b}`
triples (0-255), with no DOM or canvas dependency, so the color math itself is unit-tested
without needing a browser. The three dichromacy matrices are the widely used approximation for
simulating protanopia, deuteranopia, and tritanopia — the same family of matrices behind, e.g.,
browser devtools' "emulate vision deficiencies" tooling. Not colorimetrically exact (a full
physiological model needs linear-light color space conversions this project skips for
simplicity), but a fast, well-established approximation appropriate for an educational tool.
Every matrix's rows sum to exactly 1, so a neutral gray always maps to itself: these
deficiencies affect hue discrimination, not overall brightness.

Achromatopsia (full color blindness) instead converts toward grayscale using perceptual luma
weights (ITU-R BT.709 — green is weighted far more heavily than red or blue, matching how much
more strongly the eye's luminance response depends on green light).

**Severity** works the same way for both: it's a linear interpolation between the original
color and the fully simulated one, a standard-enough approximation of anomalous trichromacy
(partial deficiency) that doesn't require a full model of how far each affected cone's
sensitivity has actually shifted.

[`src/main.js`](src/main.js) draws the source image onto a canvas, reads it back with
`getImageData`, runs every pixel through `cvd.js`, and writes the result to a second canvas with
`putImageData` — the simulation itself never touches the DOM directly. Images larger than 480px
in either dimension are scaled down first, both for performance (a few hundred thousand pixels
processed synchronously is instant; a few million isn't) and so the two canvases fit
side by side without scrolling.

## Development

```bash
npm test
```

Tests use Node's built-in test runner (`node:test`) and check the color math's invariants:
severity 0 is a no-op, severity 1 leaves neutral gray unchanged, each dichromacy measurably
collapses the distance between the specific colors it's named for confusing (red/green for
protanopia and deuteranopia, blue/yellow for tritanopia), and achromatopsia converges to a true
gray with the expected per-channel luminance weighting.

## License

MIT, see [LICENSE](LICENSE).
