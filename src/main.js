import { simulateDichromacy, simulateAchromatopsia, listDichromacies } from "./cvd.js";

const MAX_DIMENSION = 480;
const SAMPLE_WIDTH = 480;
const SAMPLE_HEIGHT = 240;

const originalCanvas = document.getElementById("original");
const simulatedCanvas = document.getElementById("simulated");
const originalCtx = originalCanvas.getContext("2d");
const simulatedCtx = simulatedCanvas.getContext("2d");
const deficiencySelect = document.getElementById("deficiency");
const severityInput = document.getElementById("severity");
const severityValue = document.getElementById("severity-value");
const fileInput = document.getElementById("image-file");
const useSampleBtn = document.getElementById("use-sample");
const statusEl = document.getElementById("status");

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

  const pairs = [
    ["#e63946", "#2a9d8f"],
    ["#ff595e", "#8ac926"],
    ["#ffca3a", "#1982c4"],
    ["#6a4c93", "#f9c74f"],
  ];
  const swatchWidth = width / pairs.length;
  const swatchHeight = height * 0.6;
  pairs.forEach(([left, right], i) => {
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

function loadSample() {
  setCanvasSize(SAMPLE_WIDTH, SAMPLE_HEIGHT);
  drawSampleImage(originalCtx, SAMPLE_WIDTH, SAMPLE_HEIGHT);
  applySimulation();
  statusEl.textContent = "Showing the built-in sample image.";
}

function loadImageFile(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const { width, height } = fitDimensions(img.naturalWidth, img.naturalHeight, MAX_DIMENSION);
    setCanvasSize(width, height);
    originalCtx.drawImage(img, 0, 0, width, height);
    applySimulation();
    statusEl.textContent = `Showing "${file.name}".`;
    URL.revokeObjectURL(url);
  };
  img.onerror = () => {
    statusEl.textContent = `Couldn't load "${file.name}" as an image.`;
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

function applySimulation() {
  const { width, height } = originalCanvas;
  if (width === 0 || height === 0) return;

  const imageData = originalCtx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const deficiency = deficiencySelect.value;
  const severity = Number(severityInput.value) / 100;

  for (let i = 0; i < data.length; i += 4) {
    const result =
      deficiency === "achromatopsia"
        ? simulateAchromatopsia(data[i], data[i + 1], data[i + 2], severity)
        : simulateDichromacy(deficiency, data[i], data[i + 1], data[i + 2], severity);
    data[i] = result.r;
    data[i + 1] = result.g;
    data[i + 2] = result.b;
    // Alpha (data[i + 3]) is left untouched — a vision deficiency doesn't change transparency.
  }

  simulatedCtx.putImageData(imageData, 0, 0);
}

deficiencySelect.addEventListener("change", applySimulation);

severityInput.addEventListener("input", () => {
  severityValue.textContent = `${severityInput.value}%`;
  applySimulation();
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) loadImageFile(file);
});

useSampleBtn.addEventListener("click", loadSample);

populateDeficiencyOptions();
loadSample();
