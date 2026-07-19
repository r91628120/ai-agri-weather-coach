import { SATELLITE_CONFIG } from "../config/satellite.js";
import { daysBetween, isPlainObject, isValidIsoDate } from "../utils/validation.js";

const FORBIDDEN_CLIENT_KEYS = new Set([
  "accesstoken",
  "authorization",
  "clientid",
  "clientsecret",
  "cdseclientid",
  "cdseclientsecret",
  "oauthtoken",
  "token"
]);

function findForbiddenKey(value) {
  if (!value || typeof value !== "object") return null;

  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = key.replaceAll("_", "").replaceAll("-", "").toLowerCase();
    if (FORBIDDEN_CLIENT_KEYS.has(normalizedKey)) return key;
    const nested = findForbiddenKey(child);
    if (nested) return nested;
  }

  return null;
}

function validatePosition(position, path, errors) {
  if (!Array.isArray(position) || position.length < 2) {
    errors.push({ field: path, message: "Coordinate must contain longitude and latitude." });
    return;
  }

  const [longitude, latitude] = position;
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    errors.push({ field: `${path}[0]`, message: "Longitude must be between -180 and 180." });
  }
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    errors.push({ field: `${path}[1]`, message: "Latitude must be between -90 and 90." });
  }
}

function positionsMatch(first, last) {
  return Array.isArray(first) && Array.isArray(last) &&
    first.length >= 2 && last.length >= 2 &&
    first[0] === last[0] && first[1] === last[1];
}

function validatePolygonCoordinates(coordinates, path, errors) {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    errors.push({ field: path, message: "Polygon coordinates cannot be empty." });
    return;
  }

  coordinates.forEach((ring, ringIndex) => {
    const ringPath = `${path}[${ringIndex}]`;
    if (!Array.isArray(ring) || ring.length < 4) {
      errors.push({ field: ringPath, message: "A Polygon ring must contain at least four positions." });
      return;
    }
    if (!positionsMatch(ring[0], ring.at(-1))) {
      errors.push({ field: ringPath, message: "A Polygon ring must be closed." });
    }
    ring.forEach((position, positionIndex) =>
      validatePosition(position, `${ringPath}[${positionIndex}]`, errors)
    );
  });
}

function validateGeometry(geometry, errors) {
  if (!isPlainObject(geometry)) {
    errors.push({ field: "geometry", message: "Geometry is required." });
    return;
  }

  if (!(["Polygon", "MultiPolygon"].includes(geometry.type))) {
    errors.push({ field: "geometry.type", message: "Geometry type must be Polygon or MultiPolygon." });
    return;
  }

  if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) {
    errors.push({ field: "geometry.coordinates", message: "Coordinates cannot be empty." });
    return;
  }

  if (geometry.type === "Polygon") {
    validatePolygonCoordinates(geometry.coordinates, "geometry.coordinates", errors);
    return;
  }

  geometry.coordinates.forEach((polygon, index) =>
    validatePolygonCoordinates(polygon, `geometry.coordinates[${index}]`, errors)
  );
}

export function validateNdviStatisticsRequest(payload) {
  const errors = [];

  if (!isPlainObject(payload)) {
    return { valid: false, errors: [{ field: "body", message: "Request body must be a JSON object." }] };
  }

  const forbiddenKey = findForbiddenKey(payload);
  if (forbiddenKey) {
    errors.push({ field: forbiddenKey, message: "OAuth credentials and tokens are not accepted from clients." });
  }

  validateGeometry(payload.geometry, errors);

  if (!isValidIsoDate(payload.dateFrom)) {
    errors.push({ field: "dateFrom", message: "dateFrom must be a valid YYYY-MM-DD date." });
  }
  if (!isValidIsoDate(payload.dateTo)) {
    errors.push({ field: "dateTo", message: "dateTo must be a valid YYYY-MM-DD date." });
  }

  if (isValidIsoDate(payload.dateFrom) && isValidIsoDate(payload.dateTo)) {
    const rangeDays = daysBetween(payload.dateFrom, payload.dateTo);
    if (rangeDays < 0) {
      errors.push({ field: "dateFrom", message: "dateFrom cannot be later than dateTo." });
    } else if (rangeDays > SATELLITE_CONFIG.maxQueryDays) {
      errors.push({ field: "dateTo", message: `Date range cannot exceed ${SATELLITE_CONFIG.maxQueryDays} days.` });
    }
  }

  const maxCloudCoverage = payload.maxCloudCoverage ?? SATELLITE_CONFIG.defaultMaxCloudCoverage;
  if (!Number.isFinite(maxCloudCoverage) || maxCloudCoverage < 0 || maxCloudCoverage > 100) {
    errors.push({ field: "maxCloudCoverage", message: "maxCloudCoverage must be between 0 and 100." });
  }

  for (const field of ["fieldId", "fieldName"]) {
    if (payload[field] !== undefined && (typeof payload[field] !== "string" || payload[field].length > 200)) {
      errors.push({ field, message: `${field} must be a string no longer than 200 characters.` });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    value: errors.length === 0 ? {
      fieldId: payload.fieldId || null,
      fieldName: payload.fieldName || null,
      geometry: payload.geometry,
      dateFrom: payload.dateFrom,
      dateTo: payload.dateTo,
      maxCloudCoverage
    } : null
  };
}
