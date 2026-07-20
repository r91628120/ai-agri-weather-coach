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
  assert.equal(result.resultCount, 3);
  assert.equal(result.observations[0].id, "S2B_LATEST_CLEAR");
  assert.equal(result.recommendedObservation.id, "S2B_LATEST_CLEAR");
  assert.equal(result.observations[0].platform, "Sentinel-2B");
});

test("normalizes an empty Catalog response", () => {
  const result = normalizeCatalogResponse(empty, searchInput);
  assert.deepEqual(result.observations, []);
  assert.equal(result.resultCount, 0);
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

test("frontend keeps exactly one selected observation card in sync", async () => {
  const html = await readFile(new URL("../../../index.html", import.meta.url), "utf8");
  const selectionSource = html.slice(
    html.indexOf("function satelliteObservationKey("),
    html.indexOf("async function searchSatelliteObservations(")
  );
  const elements = {
    satelliteSearchResults: { innerHTML: "" },
    ndviDate: { value: "" }
  };
  const context = vm.createContext({
    document: { getElementById: (id) => elements[id] },
    escapeHtml: (value) => String(value),
    setSatelliteNdviStatus: () => {}
  });
  vm.runInContext(`
    let satelliteObservations = [];
    let selectedSatelliteObservation = null;
    let satelliteRecommendedObservationId = null;
    ${selectionSource}
  `, context);
  const observations = [
    { id: "S2-FIRST", date: "2026-07-01", platform: "Sentinel-2A", cloudCoverage: 12, processingLevel: "L2A" },
    { id: "S2-SECOND", date: "2026-07-08", platform: "Sentinel-2C", cloudCoverage: 7.4, processingLevel: "L2A" },
    { id: "S2-THIRD", date: "2026-07-11", platform: "Sentinel-2B", cloudCoverage: 18, processingLevel: "L2A" }
  ];
  const selectedIndexes = () => [...elements.satelliteSearchResults.innerHTML.matchAll(/<article class="[^"]*\bselected\b[^"]*" data-observation-index="(\d+)"/g)].map(match => Number(match[1]));

  context.renderSatelliteObservations(observations, "S2-SECOND");
  context.useSatelliteObservationDate(1);
  assert.deepEqual(selectedIndexes(), [1]);
  assert.equal((elements.satelliteSearchResults.innerHTML.match(/✅ 已選取/g) || []).length, 1);
  assert.equal((elements.satelliteSearchResults.innerHTML.match(/目前使用中/g) || []).length, 1);
  assert.equal(elements.ndviDate.value, "2026-07-08");
  assert.equal(vm.runInContext("selectedSatelliteObservation.id", context), "S2-SECOND");

  context.useSatelliteObservationDate(2);
  assert.deepEqual(selectedIndexes(), [2]);
  assert.equal(vm.runInContext("selectedSatelliteObservation.id", context), "S2-THIRD");
});

test("frontend guides users to fetch the NDVI image without calling it automatically", async () => {
  const html = await readFile(new URL("../../../index.html", import.meta.url), "utf8");
  const selectionSource = html.slice(
    html.indexOf("function satelliteObservationKey("),
    html.indexOf("async function searchSatelliteObservations(")
  );
  const classes = new Set();
  let scrollOptions = null;
  let removalCallback = null;
  let statusMessage = "";
  const elements = {
    satelliteSearchResults: { innerHTML: "" },
    ndviDate: { value: "" },
    fetchNdviImageButton: {
      offsetWidth: 120,
      classList: {
        add: (name) => classes.add(name),
        remove: (name) => classes.delete(name)
      },
      scrollIntoView: (options) => { scrollOptions = options; }
    }
  };
  const context = vm.createContext({
    document: { getElementById: (id) => elements[id] },
    escapeHtml: (value) => String(value),
    setSatelliteNdviStatus: (message) => { statusMessage = message; },
    setTimeout: (callback, delay) => { removalCallback = callback; assert.equal(delay, 2000); return 1; },
    clearTimeout: () => {}
  });
  vm.runInContext(`
    let satelliteObservations = [];
    let selectedSatelliteObservation = null;
    let satelliteRecommendedObservationId = null;
    let ndviFetchHighlightTimer = null;
    ${selectionSource}
  `, context);
  context.renderSatelliteObservations([
    { id: "S2-GUIDE", date: "2026-07-08", platform: "Sentinel-2C", cloudCoverage: 7.4 }
  ], "S2-GUIDE");
  context.useSatelliteObservationDate(0);

  assert.equal(statusMessage, "已選取 2026-07-08、雲量 7.4% 的 Sentinel-2 觀測。下一步請按『取得 NDVI 彩色影像』。");
  assert.equal(scrollOptions?.behavior, "smooth");
  assert.equal(scrollOptions?.block, "center");
  assert.equal(classes.has("ndvi-next-action-highlight"), true);
  assert.equal(typeof removalCallback, "function");
  assert.doesNotMatch(selectionSource.slice(selectionSource.indexOf("function useSatelliteObservationDate(")), /fetchNdviImage\s*\(/);

  removalCallback();
  assert.equal(classes.has("ndvi-next-action-highlight"), false);
});

test("frontend reconciles selected observation when search results rebuild", async () => {
  const html = await readFile(new URL("../../../index.html", import.meta.url), "utf8");
  const selectionSource = html.slice(
    html.indexOf("function satelliteObservationKey("),
    html.indexOf("async function searchSatelliteObservations(")
  );
  const results = { innerHTML: "" };
  const context = vm.createContext({
    document: { getElementById: (id) => id === "satelliteSearchResults" ? results : { value: "" } },
    escapeHtml: (value) => String(value),
    setSatelliteNdviStatus: () => {}
  });
  vm.runInContext(`
    let satelliteObservations = [];
    let selectedSatelliteObservation = null;
    let satelliteRecommendedObservationId = null;
    ${selectionSource}
  `, context);
  const initial = [
    { id: "S2-A", date: "2026-07-01" },
    { id: "S2-B", date: "2026-07-08" }
  ];
  context.renderSatelliteObservations(initial, "S2-B");
  context.useSatelliteObservationDate(1);
  context.renderSatelliteObservations(initial.map(item => ({ ...item })), "S2-B");
  assert.equal(vm.runInContext("selectedSatelliteObservation.id", context), "S2-B");
  assert.equal((results.innerHTML.match(/<article class="[^"]*\bselected\b[^"]*"/g) || []).length, 1);

  context.renderSatelliteObservations([{ id: "S2-C", date: "2026-07-11" }], "S2-C");
  assert.equal(vm.runInContext("selectedSatelliteObservation", context), null);
  assert.doesNotMatch(results.innerHTML, /\bselected\b/);
});

test("frontend clear actions remove observation selection and rendered cards", async () => {
  const html = await readFile(new URL("../../../index.html", import.meta.url), "utf8");
  const clearFormSource = html.slice(html.indexOf("function clearNdviForm()"), html.indexOf("function clearSelectedFieldForNdvi()"));
  const clearFieldSource = html.slice(html.indexOf("function clearSelectedFieldForNdvi()"), html.indexOf('document.addEventListener("DOMContentLoaded"', html.indexOf("function clearSelectedFieldForNdvi()")));
  for (const source of [clearFormSource, clearFieldSource]) {
    assert.match(source, /selectedSatelliteObservation = null/);
    assert.match(source, /satelliteRecommendedObservationId = null/);
    assert.match(source, /searchResults\.innerHTML = ""/);
  }
});

test("frontend inline JavaScript has valid syntax", async () => {
  const html = await readFile(new URL("../../../index.html", import.meta.url), "utf8");
  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
  assert.ok(scripts.length > 0);
  assert.match(html, /搜尋 Sentinel-2 可用觀測/);
  assert.match(html, /產品 ID：\$\{escapeHtml\(shortProductId\)\}/);
  assert.match(html, /title="\$\{escapeHtml\(productId\)\}"/);
  assert.match(html, /satellite-observation\.selected/);
  assert.match(html, /satellite-selected-badge/);
  assert.match(html, /✅ 已選取/);
  assert.match(html, /目前使用中/);
  assert.match(html, /const SELECTED_FIELD_STORAGE_KEY = "aiaikosSelectedFieldId"/);
  assert.match(html, /function setSelectedFieldForNdvi\(field\)/);
  assert.match(html, /function restoreSelectedFieldForNdvi\(\)/);
  assert.match(html, /function getSelectedFieldForSatellite\(\)/);
  assert.match(html, /已保留農地「\$\{selectedField\.name\}」的 Polygon/);
  assert.match(html, /取消目前農地/);
  assert.match(html, /NDVI 判讀完成：\$\{field\}/);
  const clearNdviSource = html.slice(html.indexOf("function clearNdviForm()"), html.indexOf("function clearSelectedFieldForNdvi()"));
  assert.doesNotMatch(clearNdviSource, /localStorage\.removeItem/);
  assert.doesNotMatch(clearNdviSource, /aiaikosSelectedFieldGeometry\s*=/);
  assert.match(clearNdviSource, /searchResults\.innerHTML = ""/);
  scripts.forEach((source, index) => assert.doesNotThrow(() => new vm.Script(source, { filename: `index-inline-${index}.js` })));
});
