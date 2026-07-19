import { errorResponse } from "../utils/response.js";
import { logError } from "../utils/logger.js";

export function handleUnhandledError(error, c) {
  logError({
    requestId: c.get("requestId"),
    errorCode: "INTERNAL_SERVER_ERROR",
    errorName: error?.name || "Error",
    safeMessage: "Unhandled application error"
  });

  return errorResponse(
    c,
    "An unexpected server error occurred",
    500,
    "INTERNAL_SERVER_ERROR"
  );
}
