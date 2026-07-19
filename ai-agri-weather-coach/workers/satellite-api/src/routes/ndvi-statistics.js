import { Hono } from "hono";
import { SATELLITE_CONFIG } from "../config/satellite.js";
import { validateNdviStatisticsRequest } from "../schemas/ndvi-statistics-schema.js";
import { requestNdviStatistics } from "../services/satellite/statistical-service.js";
import { errorResponse, successResponse } from "../utils/response.js";
import { logError } from "../utils/logger.js";

export const ndviStatisticsRoutes = new Hono();

async function readJsonBody(c) {
  if (c.req.header("authorization")) {
    return { error: errorResponse(c, "Client Authorization headers are not accepted by this endpoint.", 400, "CLIENT_AUTH_NOT_ALLOWED") };
  }

  const contentType = c.req.header("content-type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return { error: errorResponse(c, "Content-Type must be application/json.", 415, "UNSUPPORTED_MEDIA_TYPE") };
  }

  const contentLength = Number(c.req.header("content-length"));
  if (Number.isFinite(contentLength) && contentLength > SATELLITE_CONFIG.maxRequestBytes) {
    return { error: errorResponse(c, "JSON request body is too large.", 413, "REQUEST_BODY_TOO_LARGE") };
  }

  const rawBody = await c.req.text();
  if (new TextEncoder().encode(rawBody).byteLength > SATELLITE_CONFIG.maxRequestBytes) {
    return { error: errorResponse(c, "JSON request body is too large.", 413, "REQUEST_BODY_TOO_LARGE") };
  }

  try {
    return { value: JSON.parse(rawBody) };
  } catch {
    return { error: errorResponse(c, "Request body must contain valid JSON.", 400, "INVALID_JSON") };
  }
}

ndviStatisticsRoutes.post("/", async (c) => {
  const body = await readJsonBody(c);
  if (body.error) return body.error;

  const validation = validateNdviStatisticsRequest(body.value);
  if (!validation.valid) {
    return errorResponse(c, "NDVI statistics request validation failed.", 400, "VALIDATION_ERROR", {
      fields: validation.errors
    });
  }

  try {
    const data = await requestNdviStatistics(c.env, validation.value);
    return successResponse(c, data);
  } catch (error) {
    const code = error.code || "CDSE_STATISTICAL_ERROR";
    logError({
      requestId: c.get("requestId"),
      errorCode: code,
      errorName: error.name || "Error",
      safeMessage: error.message || "CDSE Statistical API request failed"
    });

    return errorResponse(
      c,
      error.message || "CDSE Statistical API request failed.",
      error.httpStatus || 502,
      code,
      { providerStatus: error.providerStatus || null }
    );
  }
});
