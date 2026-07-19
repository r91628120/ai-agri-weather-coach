import { SATELLITE_CONFIG } from "../../config/satellite.js";
import { addUtcDays } from "../../utils/validation.js";
import { getCdseAccessToken } from "../cdse-auth.js";
import { finiteNumberOrNull, parseJsonResponse, retryDelayMilliseconds, sleep } from "./satellite-utils.js";

export class CdseCatalogError extends Error {
  constructor(message, code, httpStatus = 502, providerStatus = null) {
    super(message);
    this.name = "CdseCatalogError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.providerStatus = providerStatus;
  }
}

export function buildCatalogRequest(input) {
  return {
    collections: [SATELLITE_CONFIG.dataCollection],
    intersects: input.geometry,
    datetime: `${input.dateFrom}T00:00:00Z/${addUtcDays(input.dateTo, 1)}T00:00:00Z`,
    limit: input.limit,
    filter: { op: "<=", args: [{ property: "eo:cloud_cover" }, input.maxCloudCoverage] },
    "filter-lang": "cql2-json"
  };
}

function platformLabel(feature) {
  const platform = String(feature?.properties?.platform || "").toLowerCase();
  const id = String(feature?.id || "").toUpperCase();
  if (platform.includes("2a") || id.startsWith("S2A")) return "Sentinel-2A";
  if (platform.includes("2b") || id.startsWith("S2B")) return "Sentinel-2B";
  if (platform.includes("2c") || id.startsWith("S2C")) return "Sentinel-2C";
  return "Sentinel-2";
}

function normalizeFeature(feature) {
  const datetime = feature?.properties?.datetime || feature?.properties?.start_datetime || null;
  if (!feature?.id || !datetime) return null;
  return {
    id: feature.id,
    datetime,
    date: datetime.slice(0, 10),
    platform: platformLabel(feature),
    cloudCoverage: finiteNumberOrNull(feature?.properties?.["eo:cloud_cover"]),
    processingLevel: feature?.properties?.["s2:processing_baseline"] ? "L2A" : "L2A",
    collection: SATELLITE_CONFIG.collection
  };
}

export function normalizeCatalogResponse(data, input) {
  const observations = (Array.isArray(data?.features) ? data.features : [])
    .map(normalizeFeature)
    .filter(Boolean)
    .sort((left, right) => {
      const byDate = right.date.localeCompare(left.date);
      if (byDate) return byDate;
      const byCloud = (left.cloudCoverage ?? Infinity) - (right.cloudCoverage ?? Infinity);
      if (byCloud) return byCloud;
      return Date.parse(right.datetime) - Date.parse(left.datetime);
    });
  return {
    fieldId: input.fieldId,
    fieldName: input.fieldName,
    provider: SATELLITE_CONFIG.provider,
    collection: SATELLITE_CONFIG.collection,
    requestedRange: { from: input.dateFrom, to: input.dateTo },
    maxCloudCoverage: input.maxCloudCoverage,
    observations,
    recommendedObservation: observations[0] || null
  };
}

function providerError(status) {
  if (status === 401) return new CdseCatalogError("CDSE authentication was rejected.", "CDSE_UNAUTHORIZED", 502, status);
  if (status === 403) return new CdseCatalogError("CDSE access is not permitted.", "CDSE_FORBIDDEN", 502, status);
  if (status === 429) return new CdseCatalogError("CDSE request limit was reached. Please retry later.", "CDSE_RATE_LIMITED", 503, status);
  if (status >= 500) return new CdseCatalogError("CDSE Catalog API is temporarily unavailable.", "CDSE_UNAVAILABLE", 503, status);
  return new CdseCatalogError("CDSE rejected the catalog search.", "CDSE_SEARCH_FAILED", 502, status);
}

export async function searchSatelliteObservations(env, input, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const tokenProvider = options.tokenProvider || getCdseAccessToken;
  const maxRetries = options.maxRetries ?? SATELLITE_CONFIG.maxRetries;
  const timeoutMs = options.timeoutMs ?? SATELLITE_CONFIG.requestTimeoutMs;
  const body = JSON.stringify(buildCatalogRequest(input));
  let forceRefresh = false;
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const token = await tokenProvider(env, { forceRefresh });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(SATELLITE_CONFIG.catalogApiUrl, {
        method: "POST",
        headers: { Accept: "application/geo+json", Authorization: `${token.tokenType || "Bearer"} ${token.accessToken}`, "Content-Type": "application/json" },
        body,
        signal: controller.signal
      });
      if (response.ok) {
        const data = await parseJsonResponse(response);
        if (!data) throw new CdseCatalogError("CDSE returned an invalid JSON response.", "CDSE_INVALID_RESPONSE", 502, response.status);
        return normalizeCatalogResponse(data, input);
      }
      lastError = providerError(response.status);
      const canRetry = response.status === 429 || response.status >= 500 || (response.status === 401 && !forceRefresh);
      if (!canRetry || attempt >= maxRetries) throw lastError;
      forceRefresh = response.status === 401;
      await sleep(retryDelayMilliseconds(attempt, response.headers.get("Retry-After")));
    } catch (error) {
      if (error instanceof CdseCatalogError) throw error;
      if (error?.name === "AbortError") throw new CdseCatalogError("CDSE Catalog API request timed out.", "CDSE_TIMEOUT", 504);
      lastError = new CdseCatalogError("CDSE Catalog API could not be reached.", "CDSE_SEARCH_FAILED", 502);
      if (attempt >= maxRetries) throw lastError;
      await sleep(retryDelayMilliseconds(attempt));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}
