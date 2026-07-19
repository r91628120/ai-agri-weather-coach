import { SATELLITE_CONFIG } from "../config/satellite.js";
import { errorResponse } from "./response.js";

export async function readJsonBody(c) {
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
