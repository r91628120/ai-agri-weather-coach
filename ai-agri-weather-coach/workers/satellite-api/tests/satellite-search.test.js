import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { validateSatelliteSearchRequest } from "../src/schemas/satellite-search-schema.js";
import { CdseCatalogError, buildCatalogRequest, normalizeCatalogResponse, searchSatelliteObservations } from "../src/services/satellite/catalog-service.js";

const input = JSON.parse(await readFile(new URL("./fixtures/valid-polygon.json", import.meta.url), "utf8"));
const catalog = JSON.parse(await readFile(new URL("./fixtures/cdse-catalog-response.json", import.meta.url), "utf8"));
const empty = JSON.parse(await readFile(new URL("./fixtures/cdse-catalog-empty-response.json", import.meta.url), "utf8"));
const searchInput = { ...input, limit: 10 };
const fakeToken = "TOP_SECRET_ACCESS_TOKEN";
const tokenProvider = async () => ({ accessToken: fakeToken, tokenType: "Bearer" });

test("validates Polygon defaults and builds a filtered Catalog request", () => {
  const validation = validateSatelliteSearchRequest(input);
  assert.equal(validation.valid, true);
  assert.equal(validation.value.limit, 10);
  assert.equal(validation.value.maxCloudCoverage, 30);
  const request = buildCatalogRequest(validation.value);
  assert.deepEqual(request.collections, ["sentinel-2-l2a"]);
  assert.equal(request.intersects.type, "Polygon");
  assert.equal(request.limit, 10);
  assert.equal(request.filter.args[1], 30);
});

test("accepts MultiPolygon and rejects empty geometry, invalid dates, cloud and limit", () => {
  const multi = { ...input, geometry: { type: "MultiPolygon", coordinates: [input.geometry.coordinates] }, limit: 50 };
  assert.equal(validateSatelliteSearchRequest(multi).valid, true);
  for (const invalid of [
    { ...input, geometry: { type: "Polygon", coordinates: [] } },
    { ...input, dateFrom: "2026-99-01" },
    { ...input, dateFrom: input.dateTo, dateTo: input.dateFrom },
    { ...input, maxCloudCoverage: 101 },
    { ...input, limit: 0 },
    { ...input, limit: 51 }
  ]) assert.equal(validateSatelliteSearchRequest(invalid).valid, false);
});

test("normalizes, sorts newest date first and uses lower cloud within that date", () => {
  const result = normalizeCatalogResponse(catalog, searchInput);
  assert.equal(result.observations.length, 3);
  assert.equal(result.observations[0].id, "S2B_LATEST_CLEAR");
  assert.equal(result.recommendedObservation.id, "S2B_LATEST_CLEAR");
  assert.equal(result.observations[0].platform, "Sentinel-2B");
});

test("normalizes an empty Catalog response", () => {
  const result = normalizeCatalogResponse(empty, searchInput);
  assert.deepEqual(result.observations, []);
  assert.equal(result.recommendedObservation, null);
});

for (const [status, code] of [[401, "CDSE_UNAUTHORIZED"], [429, "CDSE_RATE_LIMITED"], [500, "CDSE_UNAVAILABLE"]]) {
  test(`maps Catalog ${status} to ${code}`, async () => {
    await assert.rejects(searchSatelliteObservations({}, searchInput, {
      tokenProvider, maxRetries: 0, fetchImpl: async () => new Response("{}", { status })
    }), (error) => error instanceof CdseCatalogError && error.code === code);
  });
}

test("refreshes once after 401 and never exposes the access token", async () => {
  const refreshFlags = [];
  let calls = 0;
  const result = await searchSatelliteObservations({}, searchInput, {
    maxRetries: 1,
    tokenProvider: async (_env, options) => { refreshFlags.push(options.forceRefresh); return { accessToken: fakeToken, tokenType: "Bearer" }; },
    fetchImpl: async (_url, options) => {
      assert.equal(options.body.includes(fakeToken), false);
      calls += 1;
      return calls === 1 ? new Response("{}", { status: 401 }) : new Response(JSON.stringify(catalog), { status: 200, headers: { "Content-Type": "application/json" } });
    }
  });
  assert.deepEqual(refreshFlags, [false, true]);
  assert.equal(JSON.stringify(result).includes(fakeToken), false);
});

test("frontend inline JavaScript has valid syntax", async () => {
  const html = await readFile(new URL("../../../index.html", import.meta.url), "utf8");
  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
  assert.ok(scripts.length > 0);
  scripts.forEach((source, index) => assert.doesNotThrow(() => new vm.Script(source, { filename: `index-inline-${index}.js` })));
});
