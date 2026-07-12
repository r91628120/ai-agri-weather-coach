export async function requestIdMiddleware(c, next) {
  const incomingRequestId = c.req.header("x-request-id");

  const requestId =
    incomingRequestId?.trim() ||
    crypto.randomUUID();

  c.set("requestId", requestId);
  c.header("X-Request-ID", requestId);

  await next();
}