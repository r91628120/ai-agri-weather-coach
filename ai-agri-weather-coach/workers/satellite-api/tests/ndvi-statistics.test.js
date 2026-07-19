import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CdseStatisticalError,
  buildStatisticalRequest,
  normalizeStatisticalResponse,
  requestNdviStatistics
} from "../src/services/satellite/statistical-service.js";

const input = JSON.parse(await readFile(new URL("./fixtures/valid-polygon.json", import.meta.url), "utf8"));
const cdseResponse = JSON.parse(await readFile(new URL("./fixtures/cdse-statistical-response.json", import.meta.url), "utf8"));
const fakeToken = "TOP_SECRET_ACCESS_TOKEN";
const tokenProvider = async () => ({ accessToken: fakeToken, tokenType: "Bearer" });

test("builds a Sentinel-2 L2A least-cloud request with NDVI and dataMask", () => {
  const request = buildStatisticalRequest(input);
  assert.equal(request.input.data[0].type, "sentinel-2-l2a");
  assert.equal(request.input.data[0].dataFilter.mosaickingOrder, "leastCC");
  assert.equal(request.aggregation.resx, 10);
  assert.match(request.aggregation.evalscript, /B04/);
  assert.match(request.aggregation.evalscript, /B08/);
  assert.match(request.aggregation.evalscript, /dataMask/);
});

test("normalizes CDSE statistics and chooses the latest valid observation", () => {
  const result = normalizeStatisticalResponse(cdseResponse, input);
  assert.equal(result.observations.length, 2);
  assert.equal(result.latestObservation.ndvi.mean, 0.68);
  assert.equal(result.latestObservation.validPixelRatio, 0.9);
});

test("normalizes an empty CDSE response", () => {
  const result = normalizeStatisticalResponse({ data: [] }, input);
  assert.deepEqual(result.observations, []);
  assert.equal(result.latestObservation, null);
});

for (const [status, expectedCode] of [[401, "CDSE_UNAUTHORIZED"], [429, "CDSE_RATE_LIMITED"], [500, "CDSE_UNAVAILABLE"]]) {
  test(`maps CDSE ${status} to ${expectedCode}`, async () => {
    await assert.rejects(
      requestNdviStatistics({}, input, {
        tokenProvider,
        maxRetries: 0,
        fetchImpl: async () => new Response("{}", { status })
      }),
      (error) => error instanceof CdseStatisticalError && error.code === expectedCode
    );
  });
}

test("does not expose the access token in normalized responses or safe errors", async () => {
  const success = await requestNdviStatistics({}, input, {
    tokenProvider,
    maxRetries: 0,
    fetchImpl: async (_url, options) => {
      assert.match(options.headers.Authorization, new RegExp(fakeToken));
      return new Response(JSON.stringify(cdseResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  });
  assert.equal(JSON.stringify(success).includes(fakeToken), false);

  try {
    await requestNdviStatistics({}, input, {
      tokenProvider,
      maxRetries: 0,
      fetchImpl: async () => new Response("{}", { status: 403 })
    });
  } catch (error) {
    assert.equal(JSON.stringify(error).includes(fakeToken), false);
    assert.equal(error.message.includes(fakeToken), false);
  }
});
