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
  instead shows a **palette confusion score** for that photo's own dominant colors (see below).
- **Download simulated image** — save the currently displayed simulation (whichever view mode
  is active) as a PNG, named after the deficiency, severity, and view mode that produced it.
- **Compare all deficiencies** — toggle a row of thumbnails showing the current image under
  every deficiency at once, at the current severity (see below).
- **Click either image** — inspect the exact pixel clicked: its original color, its currently
  displayed color, and the distance between them (see below). Both images are also keyboard
  operable: focus one and use the arrow keys to aim a visible cursor (hold <kbd>Shift</kbd> for
  a single-pixel step instead of the normal 10px one), then <kbd>Enter</kbd> or <kbd>Space</kbd>
  to inspect wherever it's sitting.

## Confusion score

The sample image's four swatch pairs each pair a color from one side of a well-known confusion
(red/green, blue/yellow) with the other. For each pair, `colorDistance` (a straight-line RGB
distance — not perceptually uniform, but a consistent enough yardstick for a relative
comparison) is computed on the original colors and again after running both through the current
deficiency and severity; the percentage drop between the two is the "confusion score" for that
pair. It's a rough, per-pair number rather than a rigorous perceptual metric, but it turns "the
image looks different now" into something a little more concrete.

## Palette confusion score

The sample's four swatch pairs are hand-picked so there's always a fixed, known set of "pairs"
to score — but an arbitrary uploaded photo has no such fixed pairs. [`src/palette.js`](src/palette.js)
closes that gap: `extractPalette` groups every opaque pixel into a coarse color bucket (3 bits
per channel) and returns the handful of buckets with the most pixels, each reported as the true
average color within it — a full k-means clustering isn't necessary for "which few colors
actually dominate this image." `findConfusablePairs` then runs the same before/after
`colorDistance` comparison the sample's confusion score uses, over every pair in that palette,
and keeps the worst (biggest-drop) ones. The result is the same kind of readout as the sample's
confusion score, just computed over colors the photo actually contains instead of ones chosen
in advance — and, unlike the sample's score, it doesn't vary with daltonize mode, since
re-daltonizing an extracted palette would be scoring a correction nobody applied to the image.

## Compare all deficiencies

The other view modes answer "what does this one deficiency look like at this severity?" —
useful once you already know which one you're checking, but it means comparing two
deficiencies means switching the dropdown back and forth and trusting memory for what the
first one looked like. [`src/compareAll.js`](src/compareAll.js) instead runs
`simulateImageData` (see below) once per deficiency against the same source pixels and returns
all four results together, so **Compare all deficiencies** can lay them out side by side in one
glance. It always shows plain simulated colors — not the heatmap or daltonized view — since the
question it answers ("how does this deficiency differ from that one?") is about comparing
deficiencies against each other, not comparing view modes. The grid re-renders live as the
severity slider moves, and is hidden and cleared whenever a new image loads, since a stale set
of thumbnails at the old image's dimensions would be actively misleading.

## Pixel inspector

The confusion score and palette confusion score both answer "how confusable are these colors in
general" — for the sample's four hand-picked pairs, or for a handful of colors extracted from
the whole photo — but neither can tell you about one specific point someone's actually looking
at. [`src/pixelInspector.js`](src/pixelInspector.js) closes that gap: clicking either canvas
reads that exact `(x, y)` back from both the original and currently displayed image data and
reports each as a hex color, plus the same `colorDistance` the confusion scores use, so a single
picked pixel's own drop reads on the same scale as the rest of the app. It re-runs automatically
whenever the deficiency, view mode, or severity changes, so the readout tracks whatever's
currently selected instead of going stale after the first click, and clears whenever a new image
loads, since the old pixel coordinates may not even be in bounds of the new one.

A click's page coordinates are converted to canvas pixel coordinates by scaling against
`getBoundingClientRect()` — canvases render at `max-width: 100%; height: auto`, so on a narrow
viewport the on-screen size can be smaller than the canvas's actual pixel resolution. Without
that scaling step, a click near the edge of a shrunk canvas would read back a pixel from well
past its real edge.

A mouse click aims and inspects in one motion; a keyboard has no equivalent to hovering
somewhere before committing, so each canvas gets its own remembered cursor position instead,
moved with the arrow keys and only inspected on <kbd>Enter</kbd>/<kbd>Space</kbd> — the same
"aim, then act" shape a click gets for free. A small dot in the corresponding `.pixel-cursor`
element, positioned in percentages of the canvas's on-screen box (so it tracks the right pixel
whether or not the canvas is CSS-scaled), shows sighted keyboard users where it currently is;
the `aria-live` region the inspector result lands in already announces the outcome to a screen
reader without any extra wiring. Switching to a new image resets both cursors the same way it
clears the click-driven inspector, since either canvas may now be a different size.

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

[`src/simulateImage.js`](src/simulateImage.js) runs `cvd.js`'s per-pixel functions over a whole
RGBA buffer, returning a new buffer rather than mutating the input — both `main.js`'s two-canvas
view and `compareAll.js`'s four-way comparison build on this one loop instead of duplicating it.

[`src/main.js`](src/main.js) draws the source image onto a canvas, reads it back with
`getImageData`, runs every pixel through `simulateImage.js`, and writes the result to a second
canvas with `putImageData` — the simulation itself never touches the DOM directly. Images larger than 480px
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
`palette.js` is tested separately: bucket grouping and true-color averaging, ignoring fully
transparent pixels, respecting `maxColors`, and `findConfusablePairs` sorting worst-first and
matching a known red/green confusion under protanopia. `pixelInspector.js` is tested
separately too: hex formatting (zero-padding, uppercase), zero distance for identical colors, a
known-distance pair, and that each side's original `r`/`g`/`b` fields survive alongside the
added hex.

## License

MIT, see [LICENSE](LICENSE).
