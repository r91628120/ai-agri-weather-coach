export function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function retryDelayMilliseconds(attempt, retryAfterHeader) {
  const retryAfterSeconds = Number(retryAfterHeader);
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
    return Math.min(retryAfterSeconds * 1000, 5_000);
  }
  return Math.min(250 * (2 ** attempt), 2_000);
}

export async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function finiteNumberOrNull(value) {
  return Number.isFinite(value) ? value : null;
}
