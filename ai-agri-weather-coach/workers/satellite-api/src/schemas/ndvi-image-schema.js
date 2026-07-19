import { validateSatelliteRequest } from "./satellite-request-schema.js";
import { isValidIsoDate } from "../utils/validation.js";

export const NDVI_IMAGE_LIMITS = Object.freeze({
  defaultWidth: 768,
  defaultHeight: 768,
  minDimension: 256,
  maxDimension: 1536,
  maxPixels: 1_572_864,
  format: "image/png"
});

export function validateNdviImageRequest(payload) {
  const observationDate = payload?.observationDate;
  const base = validateSatelliteRequest({
    ...payload,
    dateFrom: observationDate,
    dateTo: observationDate
  });
  const errors = base.errors.filter(error => !["dateFrom", "dateTo"].includes(error.field));
  const width = payload?.width ?? NDVI_IMAGE_LIMITS.defaultWidth;
  const height = payload?.height ?? NDVI_IMAGE_LIMITS.defaultHeight;
  const format = payload?.format ?? NDVI_IMAGE_LIMITS.format;

  if (!isValidIsoDate(observationDate)) {
    errors.push({ field: "observationDate", message: "observationDate must be a valid YYYY-MM-DD date." });
  }

  for (const [field, value] of [["width", width], ["height", height]]) {
    if (!Number.isInteger(value) || value < NDVI_IMAGE_LIMITS.minDimension || value > NDVI_IMAGE_LIMITS.maxDimension) {
      errors.push({
        field,
        message: `${field} must be an integer between ${NDVI_IMAGE_LIMITS.minDimension} and ${NDVI_IMAGE_LIMITS.maxDimension}.`
      });
    }
  }

  if (Number.isInteger(width) && Number.isInteger(height) && width * height > NDVI_IMAGE_LIMITS.maxPixels) {
    errors.push({ field: "width", message: `Image cannot exceed ${NDVI_IMAGE_LIMITS.maxPixels} total pixels.` });
  }
  if (format !== NDVI_IMAGE_LIMITS.format) {
    errors.push({ field: "format", message: "format must be image/png." });
  }
  if (typeof payload?.fieldId === "string" && /[\r\n]/.test(payload.fieldId)) {
    errors.push({ field: "fieldId", message: "fieldId cannot contain control characters." });
  }

  return {
    valid: errors.length === 0,
    errors,
    value: errors.length ? null : {
      ...base.value,
      observationDate,
      width,
      height,
      format
    }
  };
}
