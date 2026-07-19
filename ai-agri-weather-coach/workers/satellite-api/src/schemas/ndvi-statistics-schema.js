import { validateSatelliteRequest } from "./satellite-request-schema.js";

export function validateNdviStatisticsRequest(payload) {
  return validateSatelliteRequest(payload);
}
