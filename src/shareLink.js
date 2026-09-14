// Turns the current view settings — which deficiency, at what severity, in which view mode,
// with the compare-all and severity-sweep panels open or closed — into a URL that reproduces
// them when opened. Unlike the other visualizers in this project, there's no scenario or drawn
// path to carry: an uploaded photo can't be squeezed into a URL, so a share link always applies
// to the built-in sample image, and main.js is the one that decides to switch to it. Kept
// DOM-free (only global URL/URLSearchParams) so it can be tested without a browser.

const DEFICIENCIES = new Set(["protanopia", "deuteranopia", "tritanopia", "achromatopsia"]);
const VIEW_MODES = new Set(["simulated", "heatmap", "daltonize"]);

/**
 * @param {{deficiency:string, severity:number, viewMode:string, compareAll:boolean, severitySweep:boolean}} settings
 *   `severity` is 0-1, matching every other module in this project; it's stored as a whole
 *   percentage in the link itself purely so the URL reads naturally by eye.
 * @param {string} baseUrl
 * @returns {string} a full URL with any existing hash on `baseUrl` replaced
 */
export function buildShareUrl(settings, baseUrl) {
  const url = new URL(baseUrl);
  const params = new URLSearchParams();
  params.set("deficiency", settings.deficiency);
  params.set("severity", String(Math.round(settings.severity * 100)));
  params.set("view", settings.viewMode);
  if (settings.compareAll) params.set("compare", "1");
  if (settings.severitySweep) params.set("sweep", "1");
  url.hash = params.toString();
  return url.toString();
}

/**
 * Decodes a fragment built by buildShareUrl back into settings, or returns null for anything
 * that isn't a recognizable share link — a hand-edited or unrelated hash should be silently
 * ignored on load rather than surfaced as an error, since opening the app with no hash (or an
 * unrelated one) at all is the common case, not a broken link.
 * @param {string} hash a location.hash-style string (leading "#" optional)
 * @returns {{deficiency:string, severity:number, viewMode:string, compareAll:boolean, severitySweep:boolean}|null}
 */
export function decodeSettingsFromHash(hash) {
  if (typeof hash !== "string" || hash.length === 0) return null;

  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const deficiency = params.get("deficiency");
  const viewMode = params.get("view");
  const severityPercent = Number(params.get("severity"));

  if (!deficiency || !DEFICIENCIES.has(deficiency)) return null;
  if (!viewMode || !VIEW_MODES.has(viewMode)) return null;
  if (!Number.isFinite(severityPercent) || severityPercent < 0 || severityPercent > 100) return null;

  return {
    deficiency,
    severity: severityPercent / 100,
    viewMode,
    compareAll: params.get("compare") === "1",
    severitySweep: params.get("sweep") === "1",
  };
}
