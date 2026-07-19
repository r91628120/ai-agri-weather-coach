import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateNdviStatisticsRequest } from "../src/schemas/ndvi-statistics-schema.js";

const validPayload = JSON.parse(await readFile(new URL("./fixtures/valid-polygon.json", import.meta.url), "utf8"));

function validationFor(patch) {
  return validateNdviStatisticsRequest(structuredClone({ ...validPayload, ...patch }));
}

test("accepts a valid Polygon and applies the default cloud limit", () => {
  const payload = structuredClone(validPayload);
  delete payload.maxCloudCoverage;
  const result = validateNdviStatisticsRequest(payload);
  assert.equal(result.valid, true);
  assert.equal(result.value.maxCloudCoverage, 30);
});

test("rejects empty geometry", () => {
  assert.equal(validationFor({ geometry: null }).valid, false);
});

test("rejects unsupported geometry type", () => {
  assert.equal(validationFor({ geometry: { type: "Point", coordinates: [120, 23] } }).valid, false);
});

test("rejects an unclosed Polygon", () => {
  const geometry = structuredClone(validPayload.geometry);
  geometry.coordinates[0][3] = [120.46, 23.58];
  assert.match(JSON.stringify(validationFor({ geometry }).errors), /closed/);
});

test("rejects coordinates outside longitude and latitude limits", () => {
  const geometry = structuredClone(validPayload.geometry);
  geometry.coordinates[0][0] = [181, 91];
  geometry.coordinates[0][3] = [181, 91];
  const result = validationFor({ geometry });
  assert.match(JSON.stringify(result.errors), /Longitude/);
  assert.match(JSON.stringify(result.errors), /Latitude/);
});

test("rejects invalid date formatting", () => {
  assert.equal(validationFor({ dateFrom: "2026/07/01" }).valid, false);
  assert.equal(validationFor({ dateFrom: "2026-02-30" }).valid, false);
});

test("rejects dateFrom later than dateTo", () => {
  assert.match(JSON.stringify(validationFor({ dateFrom: "2026-07-19", dateTo: "2026-07-18" }).errors), /later/);
});

test("rejects an excessive date range", () => {
  assert.match(JSON.stringify(validationFor({ dateFrom: "2025-01-01", dateTo: "2026-07-18" }).errors), /366/);
});

test("rejects maxCloudCoverage outside 0 through 100", () => {
  assert.equal(validationFor({ maxCloudCoverage: 101 }).valid, false);
  assert.equal(validationFor({ maxCloudCoverage: -1 }).valid, false);
});

test("rejects client-provided OAuth credentials and tokens", () => {
  assert.match(JSON.stringify(validationFor({ clientSecret: "must-not-be-accepted" }).errors), /not accepted/);
  assert.match(JSON.stringify(validationFor({ oauth: { access_token: "must-not-be-accepted" } }).errors), /not accepted/);
});
