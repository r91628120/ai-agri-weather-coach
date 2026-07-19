import { SATELLITE_CONFIG } from "../../config/satellite.js";
import { addUtcDays } from "../../utils/validation.js";
import { getCdseAccessToken } from "../cdse-auth.js";
import { NDVI_IMAGE_EVALSCRIPT } from "./ndvi-image-colors.js";
import { retryDelayMilliseconds, sleep } from "./satellite-utils.js";
import { WGS84_CRS } from "./satellite-constants.js";

const PNG_SIGNATURE = Object.freeze([137, 80, 78, 71, 13, 10, 26, 10]);

export class CdseProcessError extends Error {
  constructor(message, code, httpStatus = 502, providerStatus = null) {
    super(message);
    this.name = "CdseProcessError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.providerStatus = providerStatus;
  }
}

export function buildProcessRequest(input) {
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
            from: `${input.observationDate}T00:00:00Z`,
            to: `${addUtcDays(input.observationDate, 1)}T00:00:00Z`
          },
          maxCloudCoverage: input.maxCloudCoverage,
          mosaickingOrder: "mostRecent"
        }
      }]
    },
    output: {
      width: input.width,
      height: input.height,
      responses: [{ identifier: "default", format: { type: "image/png" } }]
    },
    evalscript: NDVI_IMAGE_EVALSCRIPT
  };
}

function providerError(status) {
  if (status === 401) return new CdseProcessError("CDSE authentication was rejected.", "CDSE_UNAUTHORIZED", 502, status);
  if (status === 403) return new CdseProcessError("CDSE Process API access is not permitted.", "CDSE_FORBIDDEN", 502, status);
  if (status === 404 || status === 204) return new CdseProcessError("No valid Sentinel-2 image is available for the requested observation date.", "CDSE_NO_IMAGE", 404, status);
  if (status === 429) return new CdseProcessError("CDSE request limit was reached. Please retry later.", "CDSE_RATE_LIMITED", 503, status);
  if (status >= 500) return new CdseProcessError("CDSE Process API is temporarily unavailable.", "CDSE_UNAVAILABLE", 503, status);
  return new CdseProcessError("CDSE rejected the NDVI image request.", "CDSE_REQUEST_REJECTED", 502, status);
}

function hasPngSignature(bytes) {
  if (bytes.byteLength < PNG_SIGNATURE.length) return false;
  const prefix = new Uint8Array(bytes, 0, PNG_SIGNATURE.length);
  return PNG_SIGNATURE.every((byte, index) => prefix[index] === byte);
}

export async function requestNdviImage(env, input, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const tokenProvider = options.tokenProvider || getCdseAccessToken;
  const maxRetries = options.maxRetries ?? SATELLITE_CONFIG.maxRetries;
  const timeoutMs = options.timeoutMs ?? SATELLITE_CONFIG.requestTimeoutMs;
  const requestBody = JSON.stringify(buildProcessRequest(input));
  let forceRefresh = false;
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    let token;
    try {
      token = await tokenProvider(env, { forceRefresh });
    } catch {
      throw new CdseProcessError(
        "CDSE authentication service is unavailable.",
        "CDSE_AUTH_UNAVAILABLE",
        503
      );
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(SATELLITE_CONFIG.processApiUrl, {
        method: "POST",
        headers: {
          Accept: "image/png",
          Authorization: `${token.tokenType || "Bearer"} ${token.accessToken}`,
          "Content-Type": "application/json"
        },
        body: requestBody,
        signal: controller.signal
      });

      if (response.status === 204) throw providerError(response.status);

      if (response.ok) {
        const contentType = response.headers.get("Content-Type") || "";
        if (!contentType.toLowerCase().startsWith("image/png")) {
          throw new CdseProcessError("CDSE returned a non-image response.", "CDSE_INVALID_IMAGE_RESPONSE", 502, response.status);
        }
        const bytes = await response.arrayBuffer();
        if (!hasPngSignature(bytes)) {
          throw new CdseProcessError("CDSE returned an invalid PNG image.", "CDSE_INVALID_IMAGE_RESPONSE", 502, response.status);
        }
        return { bytes, contentType: "image/png" };
      }

      lastError = providerError(response.status);
      const canRetry = response.status === 429 || response.status >= 500 || (response.status === 401 && !forceRefresh);
      if (!canRetry || attempt >= maxRetries) throw lastError;

      forceRefresh = response.status === 401;
      await sleep(retryDelayMilliseconds(attempt, response.headers.get("Retry-After")));
    } catch (error) {
      if (error instanceof CdseProcessError) throw error;
      if (error?.name === "AbortError") {
        throw new CdseProcessError("CDSE Process API request timed out.", "CDSE_TIMEOUT", 504);
      }
      lastError = new CdseProcessError("CDSE Process API could not be reached.", "CDSE_NETWORK_ERROR", 502);
      if (attempt >= maxRetries) throw lastError;
      await sleep(retryDelayMilliseconds(attempt));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}
