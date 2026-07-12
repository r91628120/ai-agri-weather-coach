export function successResponse(c, data = {}, status = 200) {
  return c.json(
    {
      success: true,
      requestId: c.get("requestId"),
      timestamp: new Date().toISOString(),
      data
    },
    status
  );
}

export function errorResponse(
  c,
  message,
  status = 500,
  code = "INTERNAL_ERROR",
  details = null
) {
  return c.json(
    {
      success: false,
      requestId: c.get("requestId"),
      timestamp: new Date().toISOString(),
      error: {
        code,
        message,
        details
      }
    },
    status
  );
}