import { validateSatelliteRequest } from "./satellite-request-schema.js";

export function validateSatelliteSearchRequest(payload) {
  return validateSatelliteRequest(payload, { includeLimit: true });
}
