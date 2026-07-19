import { Hono } from "hono";
import { validateNdviImageRequest } from "../schemas/ndvi-image-schema.js";
import { CdseProcessError, requestNdviImage } from "../services/satellite/process-service.js";
import { logError } from "../utils/logger.js";
import { readJsonBody } from "../utils/json-body.js";
import { errorResponse } from "../utils/response.js";

export function buildNdviImageResponseHeaders(input, contentType = "image/png") {
  return {
    "Content-Type": contentType,
    "Cache-Control": "private, max-age=300",
    "X-AIAKOS-Observation-Date": input.observationDate,
    "X-AIAKOS-Field-Id": encodeURIComponent(input.fieldId || "unassigned"),
    "X-AIAKOS-Data-Source": "Sentinel-2-L2A"
  };
}

export function createNdviImageRoutes({ imageRequester = requestNdviImage, errorLogger = logError } = {}) {
  const routes = new Hono();

  routes.post("/", async (c) => {
    const body = await readJsonBody(c);
    if (body.error) return body.error;

    const validation = validateNdviImageRequest(body.value);
    if (!validation.valid) {
      return errorResponse(c, "NDVI image request validation failed.", 400, "VALIDATION_ERROR", {
        fields: validation.errors
      });
    }

    try {
      const image = await imageRequester(c.env, validation.value);
      return c.body(image.bytes, 200, buildNdviImageResponseHeaders(validation.value, image.contentType));
    } catch (error) {
      const safeError = error instanceof CdseProcessError
        ? error
        : new CdseProcessError(
          "NDVI image service encountered an unexpected error.",
          "NDVI_IMAGE_INTERNAL_ERROR",
          500
        );
      errorLogger({
        requestId: c.get("requestId"),
        errorCode: safeError.code,
        errorName: error?.name || "Error",
        safeMessage: "NDVI image request failed safely."
      });
      return errorResponse(
        c,
        safeError.message,
        safeError.httpStatus,
        safeError.code,
        { providerStatus: safeError.providerStatus || null }
      );
    }
  });

  return routes;
}

export const ndviImageRoutes = createNdviImageRoutes();
