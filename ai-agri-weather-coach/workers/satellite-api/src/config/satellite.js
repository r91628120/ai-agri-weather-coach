export const SATELLITE_CONFIG = Object.freeze({
  provider: "Copernicus Data Space Ecosystem",
  collection: "Sentinel-2 L2A",
  dataCollection: "sentinel-2-l2a",
  statisticalApiUrl: "https://sh.dataspace.copernicus.eu/statistics/v1",
  processApiUrl: "https://sh.dataspace.copernicus.eu/process/v1",
  catalogApiUrl: "https://sh.dataspace.copernicus.eu/catalog/v1/search",
  resolutionMeters: 10,
  aggregationInterval: "P1D",
  maxQueryDays: 366,
  defaultMaxCloudCoverage: 30,
  defaultSearchLimit: 10,
  maxSearchLimit: 50,
  requestTimeoutMs: 10_000,
  maxRetries: 2,
  maxRequestBytes: 64 * 1024
});
