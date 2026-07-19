export function logRequest({ requestId, method, pathname, status, durationMs }) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    requestId,
    method,
    pathname,
    status,
    durationMs
  }));
}

export function logError({ requestId, errorCode, errorName, safeMessage }) {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    requestId,
    errorCode,
    errorName,
    safeMessage
  }));
}
