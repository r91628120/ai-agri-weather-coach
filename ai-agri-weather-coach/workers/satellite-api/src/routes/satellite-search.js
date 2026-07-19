import { Hono } from "hono";
import { validateSatelliteSearchRequest } from "../schemas/satellite-search-schema.js";
import { searchSatelliteObservations } from "../services/satellite/catalog-service.js";
import { logError } from "../utils/logger.js";
import { readJsonBody } from "../utils/json-body.js";
import { errorResponse, successResponse } from "../utils/response.js";

export const satelliteSearchRoutes = new Hono();

satelliteSearchRoutes.post("/", async (c) => {
  const body = await readJsonBody(c);
  if (body.error) return body.error;
  const validation = validateSatelliteSearchRequest(body.value);
  if (!validation.valid) {
    return errorResponse(c, "Satellite search request validation failed.", 400, "VALIDATION_ERROR", { fields: validation.errors });
  }
  try {
    return successResponse(c, await searchSatelliteObservations(c.env, validation.value));
  } catch (error) {
    const code = error.code || "CDSE_SEARCH_FAILED";
    logError({ requestId: c.get("requestId"), errorCode: code, errorName: error.name || "Error", safeMessage: error.message || "CDSE Catalog search failed" });
    return errorResponse(c, error.message || "CDSE Catalog search failed.", error.httpStatus || 502, code, { providerStatus: error.providerStatus || null });
  }
});
