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
- **Simulated view** — **Simulated colors** shows what the deficiency looks like directly.
  **Change heatmap** instead colors each pixel by *how much* it changed (black = no change, up
  through red, to yellow = the most change), which works on any image — the confusion score
  below only scores the sample's four known pairs, but the heatmap highlights every part of an
  uploaded photo that loses contrast, without needing to know what colors it contains ahead of
  time. **Daltonized (corrected colors)** goes the other direction: instead of showing what the
  deficiency looks like, it recolors the image to be easier to tell apart *for* someone with
  that deficiency (see below). Unavailable for achromatopsia, since full color blindness leaves
  no unaffected channel to push corrected color into.
- **Upload an image&hellip;** — process your own image. Everything happens in your browser;
  nothing is ever sent anywhere.
- **Use sample image** — reload the built-in sample: a full hue gradient plus swatch pairs
  people commonly confuse under each deficiency (reds and greens, blues and yellows). Its
  **confusion score** readout quantifies exactly how much each pair's distinguishability drops
  under the current deficiency and severity (see below); switching to your own uploaded image
  clears it, since an arbitrary photo has no fixed "known pairs" to score.
- **Download simulated image** — save the currently displayed simulation (whichever view mode
  is active) as a PNG, named after the deficiency, severity, and view mode that produced it.

## Confusion score

The sample image's four swatch pairs each pair a color from one side of a well-known confusion
(red/green, blue/yellow) with the other. For each pair, `colorDistance` (a straight-line RGB
distance — not perceptually uniform, but a consistent enough yardstick for a relative
comparison) is computed on the original colors and again after running both through the current
deficiency and severity; the percentage drop between the two is the "confusion score" for that
pair. It's a rough, per-pair number rather than a rigorous perceptual metric, but it turns "the
image looks different now" into something a little more concrete.

## Change heatmap

[`src/heatmap.js`](src/heatmap.js) maps a `colorDistance` magnitude to a black → red → yellow
color, capped at a magnitude of 150 (chosen well below the theoretical maximum of ~441, since
most real color confusions are far subtler than a full black/white swap — capping lower keeps
an ordinary photo from reading as mostly black). Where the confusion score only knows how to
score the sample image's four fixed pairs, the heatmap works on *any* image: **Simulated
view: Change heatmap** replaces each pixel's simulated color with its own change magnitude,
turning "these two specific colors get harder to tell apart" into "here's where in this exact
photo contrast is being lost" for a photo whose colors nobody hand-picked in advance.

## Daltonization

Where every other view mode simulates a deficiency, `daltonize` in [`src/cvd.js`](src/cvd.js)
does the opposite: it recolors an image to be *more* distinguishable for someone with one of the
three dichromacies, using the classic error-redistribution approach (Fidaner, Lin & Ozguven,
2005), adapted to run directly on this project's RGB matrices instead of a full LMS color-space
conversion. For each pixel, it simulates the deficiency, treats the difference from the original
as color information that deficiency discards, and pushes that difference into channels the
deficiency doesn't collapse — blue (and green) for protanopia and deuteranopia, which both
confuse red and green; red and green for tritanopia, which confuses blue and yellow instead.

It's a per-pixel heuristic, not a guarantee: the 0-255 clamp can absorb the whole correction for
colors already near black, white, or a channel extreme, so a handful of pairs see little
improvement even though most see a substantial one. In daltonize mode, the confusion score panel
reflects this directly — instead of scoring how much the *simulated* image collapses each
sample pair, it scores how much of the original separation a viewer with the deficiency would
still see after the image is daltonized.

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
protanopia and deuteranopia, blue/yellow for tritanopia), achromatopsia converges to a true
gray with the expected per-channel luminance weighting, and `daltonize` measurably recovers
distance for a representative pair per dichromacy that plain simulation collapses.

## License

MIT, see [LICENSE](LICENSE).
