import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { validateNdviImageRequest, NDVI_IMAGE_LIMITS } from "../src/schemas/ndvi-image-schema.js";
import { NDVI_IMAGE_COLORS, NDVI_IMAGE_EVALSCRIPT } from "../src/services/satellite/ndvi-image-colors.js";
import { CdseProcessError, buildProcessRequest, requestNdviImage } from "../src/services/satellite/process-service.js";
import { buildNdviImageResponseHeaders } from "../src/routes/ndvi-image.js";

const sourceInput = JSON.parse(await readFile(new URL("./fixtures/valid-polygon.json", import.meta.url), "utf8"));
const input = {
  fieldId: sourceInput.fieldId,
  fieldName: sourceInput.fieldName,
  geometry: sourceInput.geometry,
  observationDate: "2026-07-08"
};
const fakeToken = "TOP_SECRET_ACCESS_TOKEN";
const tokenProvider = async () => ({ accessToken: fakeToken, tokenType: "Bearer" });
const pngBytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
const pngResponse = () => new Response(pngBytes, { status: 200, headers: { "Content-Type": "image/png" } });

test("accepts a valid Polygon with default PNG dimensions", () => {
  const result = validateNdviImageRequest(input);
  assert.equal(result.valid, true);
  assert.equal(result.value.width, 768);
  assert.equal(result.value.height, 768);
  assert.equal(result.value.format, "image/png");
});

test("accepts a MultiPolygon", () => {
  const result = validateNdviImageRequest({
    ...input,
    geometry: { type: "MultiPolygon", coordinates: [input.geometry.coordinates] }
  });
  assert.equal(result.valid, true);
});

test("requires observationDate and validates its format", () => {
  for (const observationDate of [undefined, "2026-99-01", "08-07-2026"]) {
    const result = validateNdviImageRequest({ ...input, observationDate });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(error => error.field === "observationDate"));
  }
});

test("enforces width and height boundaries", () => {
  assert.equal(validateNdviImageRequest({ ...input, width: 256, height: 256 }).valid, true);
  assert.equal(validateNdviImageRequest({ ...input, width: 1536, height: 256 }).valid, true);
  for (const dimensions of [{ width: 255 }, { height: 255 }, { width: 1537 }, { height: 1537 }, { width: 256.5 }]) {
    assert.equal(validateNdviImageRequest({ ...input, ...dimensions }).valid, false);
  }
});

test("rejects images over the total pixel limit", () => {
  const result = validateNdviImageRequest({ ...input, width: 1536, height: 1536 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.message.includes(String(NDVI_IMAGE_LIMITS.maxPixels))));
});

test("rejects JPEG output", () => {
  const result = validateNdviImageRequest({ ...input, format: "image/jpeg" });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.field === "format"));
});

test("builds an exact-day Sentinel-2 L2A Process API request", () => {
  const validated = validateNdviImageRequest(input).value;
  const request = buildProcessRequest(validated);
  assert.equal(request.input.data[0].type, "sentinel-2-l2a");
  assert.equal(request.input.data[0].dataFilter.timeRange.from, "2026-07-08T00:00:00Z");
  assert.equal(request.input.data[0].dataFilter.timeRange.to, "2026-07-09T00:00:00Z");
  assert.equal(request.input.data[0].dataFilter.mosaickingOrder, "mostRecent");
  assert.equal(request.output.responses[0].format.type, "image/png");
});

test("central evalscript contains NDVI, dataMask, four bands and transparent invalid pixels", () => {
  assert.match(NDVI_IMAGE_EVALSCRIPT, /B04/);
  assert.match(NDVI_IMAGE_EVALSCRIPT, /B08/);
  assert.match(NDVI_IMAGE_EVALSCRIPT, /dataMask/);
  assert.match(NDVI_IMAGE_EVALSCRIPT, /bands: 4/);
  assert.match(NDVI_IMAGE_EVALSCRIPT, /dataMask === 0/);
  assert.deepEqual(NDVI_IMAGE_COLORS.invalid, [0, 0, 0, 0]);
  assert.match(NDVI_IMAGE_EVALSCRIPT, /ndvi < 0\.2/);
  assert.match(NDVI_IMAGE_EVALSCRIPT, /ndvi < 0\.4/);
  assert.match(NDVI_IMAGE_EVALSCRIPT, /ndvi < 0\.6/);
  assert.match(NDVI_IMAGE_EVALSCRIPT, /ndvi < 0\.8/);
});

test("returns HTTP 200 PNG bytes without JSON or Base64 conversion", async () => {
  const result = await requestNdviImage({}, validateNdviImageRequest(input).value, {
    tokenProvider,
    maxRetries: 0,
    fetchImpl: async (_url, options) => {
      assert.equal(options.headers.Accept, "image/png");
      assert.match(options.headers.Authorization, new RegExp(fakeToken));
      return pngResponse();
    }
  });
  assert.equal(result.contentType, "image/png");
  assert.ok(result.bytes instanceof ArrayBuffer);
  assert.deepEqual([...new Uint8Array(result.bytes).slice(0, 8)], [...pngBytes.slice(0, 8)]);
  assert.equal(typeof result.bytes, "object");
});

test("builds required safe PNG response headers", () => {
  const headers = buildNdviImageResponseHeaders(input);
  assert.equal(headers["Content-Type"], "image/png");
  assert.equal(headers["Cache-Control"], "private, max-age=300");
  assert.equal(headers["X-AIAKOS-Observation-Date"], input.observationDate);
  assert.equal(headers["X-AIAKOS-Field-Id"], encodeURIComponent(input.fieldId));
  assert.equal(headers["X-AIAKOS-Data-Source"], "Sentinel-2-L2A");
});

test("refreshes the token once after a 401", async () => {
  const refreshFlags = [];
  let calls = 0;
  const result = await requestNdviImage({}, validateNdviImageRequest(input).value, {
    maxRetries: 1,
    tokenProvider: async (_env, options) => {
      refreshFlags.push(options.forceRefresh);
      return { accessToken: fakeToken, tokenType: "Bearer" };
    },
    fetchImpl: async () => (++calls === 1 ? new Response("", { status: 401 }) : pngResponse())
  });
  assert.equal(result.contentType, "image/png");
  assert.deepEqual(refreshFlags, [false, true]);
});

for (const [status, expectedCode] of [
  [403, "CDSE_FORBIDDEN"],
  [429, "CDSE_RATE_LIMITED"],
  [500, "CDSE_UNAVAILABLE"]
]) {
  test(`maps Process API ${status} to ${expectedCode}`, async () => {
    await assert.rejects(
      requestNdviImage({}, validateNdviImageRequest(input).value, {
        tokenProvider,
        maxRetries: 0,
        fetchImpl: async () => new Response("upstream details", { status })
      }),
      error => error instanceof CdseProcessError && error.code === expectedCode && !error.message.includes("upstream details")
    );
  });
}

test("maps timeout to a safe error", async () => {
  await assert.rejects(
    requestNdviImage({}, validateNdviImageRequest(input).value, {
      tokenProvider,
      timeoutMs: 5,
      maxRetries: 0,
      fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
      })
    }),
    error => error.code === "CDSE_TIMEOUT" && error.httpStatus === 504
  );
});

test("rejects a non-image upstream response", async () => {
  await assert.rejects(
    requestNdviImage({}, validateNdviImageRequest(input).value, {
      tokenProvider,
      maxRetries: 0,
      fetchImpl: async () => new Response('{"error":"private upstream detail"}', { status: 200, headers: { "Content-Type": "application/json" } })
    }),
    error => error.code === "CDSE_INVALID_IMAGE_RESPONSE" && !error.message.includes("private upstream detail")
  );
});

test("returns an explicit safe error when no image exists for the date", async () => {
  await assert.rejects(
    requestNdviImage({}, validateNdviImageRequest(input).value, {
      tokenProvider,
      maxRetries: 0,
      fetchImpl: async () => new Response(null, { status: 204 })
    }),
    error => error.code === "CDSE_NO_IMAGE" && error.httpStatus === 404
  );
});

test("never exposes a Secret or access token in errors", async () => {
  const secret = "TOP_SECRET_CLIENT_SECRET";
  try {
    await requestNdviImage({}, validateNdviImageRequest(input).value, {
      tokenProvider,
      maxRetries: 0,
      fetchImpl: async () => new Response(`${fakeToken} ${secret}`, { status: 403 })
    });
    assert.fail("Expected Process API failure");
  } catch (error) {
    const serialized = JSON.stringify({ name: error.name, code: error.code, message: error.message });
    assert.equal(serialized.includes(fakeToken), false);
    assert.equal(serialized.includes(secret), false);
  }
});

test("frontend creates and revokes Blob URLs, clears images and preserves selected fields", async () => {
  const html = await readFile(new URL("../../../index.html", import.meta.url), "utf8");
  assert.match(html, /response\.blob\(\)/);
  assert.match(html, /URL\.createObjectURL\(blob\)/);
  assert.match(html, /URL\.revokeObjectURL\(ndviImageObjectUrl\)/);
  assert.match(html, /function clearNdviImage\(/);
  const clearImageSource = html.slice(html.indexOf("function clearNdviImage("), html.indexOf("function clearNdviForm()"));
  assert.doesNotMatch(clearImageSource, /SELECTED_FIELD_STORAGE_KEY/);
  assert.doesNotMatch(clearImageSource, /aiaikosSelectedFieldGeometry\s*=/);
});

test("frontend inline JavaScript has valid syntax", async () => {
  const html = await readFile(new URL("../../../index.html", import.meta.url), "utf8");
  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
  scripts.forEach((source, index) => assert.doesNotThrow(() => new vm.Script(source, { filename: `index-inline-${index}.js` })));
});
