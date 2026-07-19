import { SATELLITE_CONFIG } from "../../config/satellite.js";
import { addUtcDays } from "../../utils/validation.js";
import { getCdseAccessToken } from "../cdse-auth.js";
import { NDVI_EVALSCRIPT, WGS84_CRS } from "./satellite-constants.js";
import {
  finiteNumberOrNull,
  parseJsonResponse,
  retryDelayMilliseconds,
  sleep
} from "./satellite-utils.js";

export class CdseStatisticalError extends Error {
  constructor(message, code, httpStatus = 502, providerStatus = null) {
    super(message);
    this.name = "CdseStatisticalError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.providerStatus = providerStatus;
  }
}

export function buildStatisticalRequest(input) {
  return {
    input: {
      bounds: {
        geometry: input.geometry,
        properties: { crs: WGS84_CRS }
      },
      data: [{
        type: SATELLITE_CONFIG.dataCollection,
        dataFilter: {
          timeRange: {
            from: `${input.dateFrom}T00:00:00Z`,
            to: `${addUtcDays(input.dateTo, 1)}T00:00:00Z`
          },
          maxCloudCoverage: input.maxCloudCoverage,
          mosaickingOrder: "leastCC"
        }
      }]
    },
    aggregation: {
      timeRange: {
        from: `${input.dateFrom}T00:00:00Z`,
        to: `${addUtcDays(input.dateTo, 1)}T00:00:00Z`
      },
      aggregationInterval: { of: SATELLITE_CONFIG.aggregationInterval },
      evalscript: NDVI_EVALSCRIPT,
      resx: SATELLITE_CONFIG.resolutionMeters,
      resy: SATELLITE_CONFIG.resolutionMeters
    }
  };
}

function normalizeObservation(item) {
  const stats = item?.outputs?.ndvi?.bands?.B0?.stats;
  if (!stats) return null;

  const sampleCount = finiteNumberOrNull(stats.sampleCount) ?? 0;
  const noDataCount = finiteNumberOrNull(stats.noDataCount) ?? 0;
  const validPixelCount = Math.max(0, sampleCount - noDataCount);

  return {
    intervalFrom: item?.interval?.from || null,
    intervalTo: item?.interval?.to || null,
    ndvi: {
      mean: finiteNumberOrNull(stats.mean),
      min: finiteNumberOrNull(stats.min),
      max: finiteNumberOrNull(stats.max),
      stDev: finiteNumberOrNull(stats.stDev)
    },
    sampleCount,
    noDataCount,
    validPixelRatio: sampleCount > 0 ? validPixelCount / sampleCount : 0
  };
}

function isValidObservation(observation) {
  return observation && observation.sampleCount > observation.noDataCount &&
    observation.ndvi.mean !== null;
}

export function normalizeStatisticalResponse(responseData, input) {
  const observations = Array.isArray(responseData?.data)
    ? responseData.data.map(normalizeObservation).filter(Boolean)
    : [];

  const latestObservation = observations
    .filter(isValidObservation)
    .sort((left, right) => Date.parse(right.intervalTo || 0) - Date.parse(left.intervalTo || 0))[0] || null;

  return {
    fieldId: input.fieldId,
    fieldName: input.fieldName,
    provider: SATELLITE_CONFIG.provider,
    collection: SATELLITE_CONFIG.collection,
    resolutionMeters: SATELLITE_CONFIG.resolutionMeters,
    requestedRange: { from: input.dateFrom, to: input.dateTo },
    latestObservation,
    observations
  };
}

function providerError(status) {
  if (status === 401) return new CdseStatisticalError("CDSE authentication was rejected.", "CDSE_UNAUTHORIZED", 502, status);
  if (status === 403) return new CdseStatisticalError("CDSE access is not permitted.", "CDSE_FORBIDDEN", 502, status);
  if (status === 429) return new CdseStatisticalError("CDSE request limit was reached. Please retry later.", "CDSE_RATE_LIMITED", 503, status);
  if (status >= 500) return new CdseStatisticalError("CDSE Statistical API is temporarily unavailable.", "CDSE_UNAVAILABLE", 503, status);
  return new CdseStatisticalError("CDSE rejected the statistical request.", "CDSE_REQUEST_REJECTED", 502, status);
}

export async function requestNdviStatistics(env, input, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const tokenProvider = options.tokenProvider || getCdseAccessToken;
  const maxRetries = options.maxRetries ?? SATELLITE_CONFIG.maxRetries;
  const timeoutMs = options.timeoutMs ?? SATELLITE_CONFIG.requestTimeoutMs;
  const requestBody = JSON.stringify(buildStatisticalRequest(input));
  let forceRefresh = false;
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const token = await tokenProvider(env, { forceRefresh });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(SATELLITE_CONFIG.statisticalApiUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `${token.tokenType || "Bearer"} ${token.accessToken}`,
          "Content-Type": "application/json"
        },
        body: requestBody,
        signal: controller.signal
      });

      if (response.ok) {
        const data = await parseJsonResponse(response);
        if (!data) {
          throw new CdseStatisticalError("CDSE returned an invalid JSON response.", "CDSE_INVALID_RESPONSE", 502, response.status);
        }
        return normalizeStatisticalResponse(data, input);
      }

      lastError = providerError(response.status);
      const canRetry = response.status === 429 || response.status >= 500 || (response.status === 401 && !forceRefresh);
      if (!canRetry || attempt >= maxRetries) throw lastError;

      forceRefresh = response.status === 401;
      await sleep(retryDelayMilliseconds(attempt, response.headers.get("Retry-After")));
    } catch (error) {
      if (error instanceof CdseStatisticalError) throw error;
      if (error?.name === "AbortError") {
        throw new CdseStatisticalError("CDSE Statistical API request timed out.", "CDSE_TIMEOUT", 504);
      }
      lastError = new CdseStatisticalError("CDSE Statistical API could not be reached.", "CDSE_NETWORK_ERROR", 502);
      if (attempt >= maxRetries) throw lastError;
      await sleep(retryDelayMilliseconds(attempt));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}
