export const NDVI_IMAGE_COLORS = Object.freeze({
  invalid: Object.freeze([0, 0, 0, 0]),
  veryLow: Object.freeze({ maxExclusive: 0.20, rgba: Object.freeze([0.86, 0.15, 0.15, 1]) }),
  low: Object.freeze({ maxExclusive: 0.40, rgba: Object.freeze([0.98, 0.45, 0.09, 1]) }),
  medium: Object.freeze({ maxExclusive: 0.60, rgba: Object.freeze([0.98, 0.80, 0.08, 1]) }),
  good: Object.freeze({ maxExclusive: 0.80, rgba: Object.freeze([0.45, 0.78, 0.30, 1]) }),
  vigorous: Object.freeze({ rgba: Object.freeze([0.08, 0.50, 0.20, 1]) })
});

function evalscriptColor(color) {
  return `[${color.join(", ")}]`;
}

export function buildNdviImageEvalscript() {
  const colors = NDVI_IMAGE_COLORS;
  return `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "dataMask"] }],
    output: { bands: 4, sampleType: "AUTO" }
  };
}

function evaluatePixel(sample) {
  const denominator = sample.B08 + sample.B04;
  if (sample.dataMask === 0 || denominator === 0) return ${evalscriptColor(colors.invalid)};

  const ndvi = (sample.B08 - sample.B04) / denominator;
  if (ndvi < ${colors.veryLow.maxExclusive}) return ${evalscriptColor(colors.veryLow.rgba)};
  if (ndvi < ${colors.low.maxExclusive}) return ${evalscriptColor(colors.low.rgba)};
  if (ndvi < ${colors.medium.maxExclusive}) return ${evalscriptColor(colors.medium.rgba)};
  if (ndvi < ${colors.good.maxExclusive}) return ${evalscriptColor(colors.good.rgba)};
  return ${evalscriptColor(colors.vigorous.rgba)};
}`;
}

export const NDVI_IMAGE_EVALSCRIPT = buildNdviImageEvalscript();
