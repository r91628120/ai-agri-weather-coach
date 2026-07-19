import { logRequest } from "../utils/logger.js";

export async function requestLoggerMiddleware(c, next) {
  const startedAt = Date.now();
  await next();
  logRequest({
    requestId: c.get("requestId"),
    method: c.req.method,
    pathname: new URL(c.req.url).pathname,
    status: c.res.status,
    durationMs: Date.now() - startedAt
  });
}
