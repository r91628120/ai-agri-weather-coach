import { errorResponse } from "../utils/response.js";

export function notImplemented(c) {
  return errorResponse(
    c,
    "This endpoint is reserved for a future AIAKOS Satellite Service release.",
    501,
    "NOT_IMPLEMENTED"
  );
}
