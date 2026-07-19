import { Hono } from "hono";
import { validateNdviStatisticsRequest } from "../schemas/ndvi-statistics-schema.js";
import { requestNdviStatistics } from "../services/satellite/statistical-service.js";
import { errorResponse, successResponse } from "../utils/response.js";
import { logError } from "../utils/logger.js";
import { readJsonBody } from "../utils/json-body.js";

export const ndviStatisticsRoutes = new Hono();

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
