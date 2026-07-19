export const NDVI_EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "dataMask"] }],
    output: [
      { id: "ndvi", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}

function evaluatePixel(sample) {
  const denominator = sample.B08 + sample.B04;
  const valid = sample.dataMask === 1 && denominator !== 0;
  return {
    ndvi: [valid ? (sample.B08 - sample.B04) / denominator : 0],
    dataMask: [valid ? 1 : 0]
  };
}`;

export const WGS84_CRS = "http://www.opengis.net/def/crs/OGC/1.3/CRS84";
