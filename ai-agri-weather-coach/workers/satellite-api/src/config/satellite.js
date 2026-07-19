export const SATELLITE_CONFIG = Object.freeze({
  provider: "Copernicus Data Space Ecosystem",
  collection: "Sentinel-2 L2A",
  dataCollection: "sentinel-2-l2a",
  statisticalApiUrl: "https://sh.dataspace.copernicus.eu/statistics/v1",
  resolutionMeters: 10,
  aggregationInterval: "P1D",
  maxQueryDays: 366,
  defaultMaxCloudCoverage: 30,
  requestTimeoutMs: 10_000,
  maxRetries: 2,
  maxRequestBytes: 64 * 1024
});
