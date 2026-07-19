import { Hono } from "hono";
import { validateNdviImageRequest } from "../schemas/ndvi-image-schema.js";
import { requestNdviImage } from "../services/satellite/process-service.js";
import { logError } from "../utils/logger.js";
import { readJsonBody } from "../utils/json-body.js";
import { errorResponse } from "../utils/response.js";

export const ndviImageRoutes = new Hono();

export function buildNdviImageResponseHeaders(input, contentType = "image/png") {
  return {
    "Content-Type": contentType,
    "Cache-Control": "private, max-age=300",
    "X-AIAKOS-Observation-Date": input.observationDate,
    "X-AIAKOS-Field-Id": encodeURIComponent(input.fieldId || "unassigned"),
    "X-AIAKOS-Data-Source": "Sentinel-2-L2A"
  };
}

ndviImageRoutes.post("/", async (c) => {
  const body = await readJsonBody(c);
  if (body.error) return body.error;

  const validation = validateNdviImageRequest(body.value);
  if (!validation.valid) {
    return errorResponse(c, "NDVI image request validation failed.", 400, "VALIDATION_ERROR", {
      fields: validation.errors
    });
  }

  try {
    const image = await requestNdviImage(c.env, validation.value);
    return c.body(image.bytes, 200, buildNdviImageResponseHeaders(validation.value, image.contentType));
  } catch (error) {
    const code = error.code || "CDSE_PROCESS_ERROR";
    logError({
      requestId: c.get("requestId"),
      errorCode: code,
      errorName: error.name || "Error",
      safeMessage: error.message || "CDSE Process API request failed"
    });
    return errorResponse(
      c,
      error.message || "CDSE Process API request failed.",
      error.httpStatus || 502,
      code,
      { providerStatus: error.providerStatus || null }
    );
  }
});
