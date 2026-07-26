import { daltonize, listDichromacies, colorDistance, hexToRgb } from "./cvd.js";
import { heatmapColor } from "./heatmap.js";
import { simulateColor } from "./simulateImage.js";
import { compareAllDeficiencies } from "./compareAll.js";
import { extractPalette, findConfusablePairs } from "./palette.js";

const MAX_DIMENSION = 480;
const SAMPLE_WIDTH = 480;
const SAMPLE_HEIGHT = 240;

// Shared between drawing the sample image and scoring how confusable each pair becomes — a
// single source of truth for "what colors does the sample actually contain".
const SAMPLE_SWATCH_PAIRS = [
  ["#e63946", "#2a9d8f"],
  ["#ff595e", "#8ac926"],
  ["#ffca3a", "#1982c4"],
  ["#6a4c93", "#f9c74f"],
];

const originalCanvas = document.getElementById("original");
const simulatedCanvas = document.getElementById("simulated");
const originalCtx = originalCanvas.getContext("2d");
const simulatedCtx = simulatedCanvas.getContext("2d");
const deficiencySelect = document.getElementById("deficiency");
const viewModeSelect = document.getElementById("view-mode");
const severityInput = document.getElementById("severity");
const severityValue = document.getElementById("severity-value");
const fileInput = document.getElementById("image-file");
const useSampleBtn = document.getElementById("use-sample");
const downloadBtn = document.getElementById("download-simulated");
const compareAllBtn = document.getElementById("compare-all");
const compareAllGrid = document.getElementById("compare-all-grid");
const statusEl = document.getElementById("status");
const confusionScoreEl = document.getElementById("confusion-score");
const simulatedCaptionEl = document.getElementById("simulated-caption");
const daltonizeOption = viewModeSelect.querySelector('option[value="daltonize"]');

let showingSample = true;
let compareAllVisible = false;

// Achromatopsia collapses every channel to the same gray, leaving no unaffected channel for
// daltonize to redistribute lost color into — so daltonization only applies to the three
// dichromacies, not achromatopsia.
function canDaltonize(deficiency) {
  return deficiency !== "achromatopsia";
}

function populateDeficiencyOptions() {
  for (const name of listDichromacies()) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name.charAt(0).toUpperCase() + name.slice(1);
    deficiencySelect.appendChild(option);
  }
  const achromatopsia = document.createElement("option");
  achromatopsia.value = "achromatopsia";
  achromatopsia.textContent = "Achromatopsia (full color blindness)";
  deficiencySelect.appendChild(achromatopsia);
}

// A hue gradient plus swatch pairs commonly confused under each deficiency (red/green,
// blue/yellow), generated entirely in canvas rather than bundling an image file — no
// licensing questions, and it's immediately meaningful without anyone uploading their own photo.
function drawSampleImage(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  const hues = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360];
  hues.forEach((hue, i) => gradient.addColorStop(i / (hues.length - 1), `hsl(${hue}, 90%, 55%)`));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height * 0.4);

  const swatchWidth = width / SAMPLE_SWATCH_PAIRS.length;
  const swatchHeight = height * 0.6;
  SAMPLE_SWATCH_PAIRS.forEach(([left, right], i) => {
    ctx.fillStyle = left;
    ctx.fillRect(i * swatchWidth, height * 0.4, swatchWidth / 2, swatchHeight);
    ctx.fillStyle = right;
    ctx.fillRect(i * swatchWidth + swatchWidth / 2, height * 0.4, swatchWidth / 2, swatchHeight);
  });
}

function fitDimensions(width, height, maxDimension) {
  if (width <= maxDimension && height <= maxDimension) return { width, height };
  const scale = maxDimension / Math.max(width, height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function setCanvasSize(width, height) {
  originalCanvas.width = width;
  originalCanvas.height = height;
  simulatedCanvas.width = width;
  simulatedCanvas.height = height;
}

// A new image invalidates any thumbnails compare-all already drew for the previous one
// (wrong dimensions, wrong colors) — hide it rather than leave stale thumbnails on screen.
function hideCompareAll() {
  compareAllVisible = false;
  compareAllGrid.hidden = true;
  compareAllGrid.innerHTML = "";
  compareAllBtn.setAttribute("aria-expanded", "false");
}

function loadSample() {
  showingSample = true;
  setCanvasSize(SAMPLE_WIDTH, SAMPLE_HEIGHT);
  drawSampleImage(originalCtx, SAMPLE_WIDTH, SAMPLE_HEIGHT);
  applySimulation();
  hideCompareAll();
  statusEl.textContent = "Showing the built-in sample image.";
}

function loadImageFile(file) {
  showingSample = false;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const { width, height } = fitDimensions(img.naturalWidth, img.naturalHeight, MAX_DIMENSION);
    setCanvasSize(width, height);
    originalCtx.drawImage(img, 0, 0, width, height);
    applySimulation();
    hideCompareAll();
    statusEl.textContent = `Showing "${file.name}".`;
    URL.revokeObjectURL(url);
  };
  img.onerror = () => {
    statusEl.textContent = `Couldn't load "${file.name}" as an image.`;
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

const VIEW_MODE_CAPTIONS = {
  simulated: "Simulated",
  heatmap: "Simulated",
  daltonize: "Daltonized",
};

// Disallows selecting "Daltonized" for achromatopsia (see canDaltonize) — falls back to
// "Simulated colors" if it was already selected when the deficiency changed to achromatopsia.
function updateViewModeAvailability(deficiency) {
  const allowed = canDaltonize(deficiency);
  daltonizeOption.disabled = !allowed;
  if (!allowed && viewModeSelect.value === "daltonize") {
    viewModeSelect.value = "simulated";
  }
}

function applySimulation() {
  const { width, height } = originalCanvas;
  if (width === 0 || height === 0) return;

  const imageData = originalCtx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const deficiency = deficiencySelect.value;
  const severity = Number(severityInput.value) / 100;
  updateViewModeAvailability(deficiency);
  const mode = viewModeSelect.value;
  simulatedCaptionEl.textContent = VIEW_MODE_CAPTIONS[mode];

  for (let i = 0; i < data.length; i += 4) {
    const original = { r: data[i], g: data[i + 1], b: data[i + 2] };
    let result;
    if (mode === "daltonize") {
      result = daltonize(deficiency, original.r, original.g, original.b, severity);
    } else {
      const simulated = simulateColor(deficiency, original.r, original.g, original.b, severity);
      result = mode === "heatmap" ? heatmapColor(colorDistance(original, simulated)) : simulated;
    }
    data[i] = result.r;
    data[i + 1] = result.g;
    data[i + 2] = result.b;
    // Alpha (data[i + 3]) is left untouched — a vision deficiency doesn't change transparency.
  }

  simulatedCtx.putImageData(imageData, 0, 0);
  updateConfusionScore(deficiency, severity, mode);
}

// Quantifies exactly how much harder pairs of colors are to tell apart under the current
// deficiency and severity. For the sample image, scores its four fixed, hand-picked swatch
// pairs (see SAMPLE_SWATCH_PAIRS). For an uploaded photo, which has no such fixed pairs, scores
// the worst pairs among a small palette extracted from whatever colors the photo actually
// contains instead (see updatePaletteConfusionScore). In daltonize mode, scores what a viewer
// with the deficiency would see after daltonizing instead — the same "how far apart do these
// end up" comparison, just measured on the corrected colors so it reflects how much of the
// original distinguishability the correction actually restores.
function updateConfusionScore(deficiency, severity, mode) {
  if (!showingSample) {
    updatePaletteConfusionScore(deficiency, severity);
    return;
  }

  const isDaltonize = mode === "daltonize";
  const items = SAMPLE_SWATCH_PAIRS.map(([leftHex, rightHex], i) => {
    const left = hexToRgb(leftHex);
    const right = hexToRgb(rightHex);
    const before = colorDistance(left, right);
    const [viewedLeft, viewedRight] = isDaltonize
      ? [daltonize(deficiency, left.r, left.g, left.b, severity), daltonize(deficiency, right.r, right.g, right.b, severity)]
      : [left, right];
    const after = colorDistance(
      simulateColor(deficiency, viewedLeft.r, viewedLeft.g, viewedLeft.b, severity),
      simulateColor(deficiency, viewedRight.r, viewedRight.g, viewedRight.b, severity)
    );
    const percentOfOriginal = before === 0 ? 100 : Math.round((after / before) * 100);
    const description = isDaltonize
      ? `recovered to ${percentOfOriginal}% of the original separation`
      : `distinguishability down ${100 - percentOfOriginal}%`;
    return `<li>Pair ${i + 1}: ${description}</li>`;
  });

  const label = isDaltonize ? "Confusion score after daltonizing" : "Confusion score";
  confusionScoreEl.innerHTML = `<p>${label}</p><ul>${items.join("")}</ul>`;
}

// Extracts a small palette of dominant colors from the uploaded image (see palette.js) and
// reports its worst pairs — the same before/after colorDistance comparison as the sample's
// fixed swatch pairs, just run over colors the photo itself actually contains instead of ones
// chosen in advance. Always plain simulated confusability, regardless of view mode: daltonize's
// "recovered separation" framing is specific to the sample's daltonize/cvd.js pipeline, and
// re-daltonizing an extracted palette would score a correction nobody applied to this image.
function updatePaletteConfusionScore(deficiency, severity) {
  const { width, height } = originalCanvas;
  if (width === 0 || height === 0) {
    confusionScoreEl.innerHTML = "";
    return;
  }

  const { data } = originalCtx.getImageData(0, 0, width, height);
  const palette = extractPalette(data);
  const pairs = findConfusablePairs(palette, deficiency, severity);
  if (pairs.length === 0) {
    confusionScoreEl.innerHTML = "";
    return;
  }

  const items = pairs.map(({ a, b, drop }) => {
    const swatch = (c) => `<span class="swatch" style="background:rgb(${c.r},${c.g},${c.b})"></span>`;
    return `<li>${swatch(a)}${swatch(b)} distinguishability down ${Math.round(drop)}%</li>`;
  });
  confusionScoreEl.innerHTML = `<p>Palette confusion score</p><ul>${items.join("")}</ul>`;
}

// Shows the current image under every deficiency at once, at the current severity, always in
// plain "simulated colors" (not daltonize/heatmap — those describe a view mode, not a
// deficiency, so mixing them into a deficiency comparison would answer a different question
// than the one this view is for).
function renderCompareAll() {
  const { width, height } = originalCanvas;
  if (width === 0 || height === 0) return;

  const { data } = originalCtx.getImageData(0, 0, width, height);
  const severity = Number(severityInput.value) / 100;
  const results = compareAllDeficiencies(data, severity);

  compareAllGrid.innerHTML = "";
  for (const { name, data: simulatedData } of results) {
    const figure = document.createElement("figure");
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", `The image as simulated for ${name}`);
    canvas.getContext("2d").putImageData(new ImageData(simulatedData, width, height), 0, 0);

    const caption = document.createElement("figcaption");
    caption.textContent = name.charAt(0).toUpperCase() + name.slice(1);

    figure.append(canvas, caption);
    compareAllGrid.appendChild(figure);
  }
}

deficiencySelect.addEventListener("change", applySimulation);
viewModeSelect.addEventListener("change", applySimulation);

severityInput.addEventListener("input", () => {
  severityValue.textContent = `${severityInput.value}%`;
  applySimulation();
  if (compareAllVisible) renderCompareAll();
});

compareAllBtn.addEventListener("click", () => {
  compareAllVisible = !compareAllVisible;
  compareAllGrid.hidden = !compareAllVisible;
  compareAllBtn.setAttribute("aria-expanded", String(compareAllVisible));
  if (compareAllVisible) renderCompareAll();
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) loadImageFile(file);
});

useSampleBtn.addEventListener("click", loadSample);

downloadBtn.addEventListener("click", () => {
  const deficiency = deficiencySelect.value;
  const severity = severityInput.value;
  const mode = viewModeSelect.value;
  const link = document.createElement("a");
  link.href = simulatedCanvas.toDataURL("image/png");
  link.download = `chromalens-${deficiency}-${severity}pct-${mode}.png`;
  link.click();
});

populateDeficiencyOptions();
loadSample();
