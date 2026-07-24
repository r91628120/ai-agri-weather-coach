import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const html = await readFile(new URL("../../../index.html", import.meta.url), "utf8");
const journalSource = html.slice(
  html.indexOf('const DECISION_JOURNAL_DRAFT_KEY'),
  html.indexOf("function getFarmLogs()")
);

test("upgrades the existing farmLog section without creating a competing journal page", () => {
  assert.equal((html.match(/id="farmLog"/g) || []).length, 1);
  assert.equal((html.match(/id="decisionJournalForm"/g) || []).length, 1);
  assert.match(html, /AI 農場決策日誌/);
  assert.match(html, /既有 AI 農場經營日誌紀錄（保留且不覆寫）/);
  assert.match(html, /localStorage\.getItem\("farmLogs"\)/);
});

test("keeps facts, AI analysis, human decision, operations, outcome and experience separate", () => {
  for (const key of [
    "journalMeta",
    "farmContext",
    "aiSnapshot",
    "farmerDecision",
    "farmOperations",
    "operationDetails",
    "outcome",
    "experienceNotes",
    "media",
    "status"
  ]) {
    assert.match(journalSource, new RegExp(`${key}:`));
  }
  assert.match(journalSource, /readonly: true/);
  assert.match(journalSource, /expected: \{/);
  assert.match(journalSource, /actual: \{/);
  assert.match(journalSource, /createdAt:/);
  assert.match(journalSource, /updatedAt:/);
  assert.match(journalSource, /version: "1\.0-prototype"/);
});

test("renders four read-only AI snapshot cards with empty, loading and mock states", () => {
  assert.equal((html.match(/class="journal-snapshot-card"/g) || []).length, 4);
  assert.equal((html.match(/系統自動帶入｜唯讀/g) || []).length, 4);
  assert.match(html, /value="empty">尚無資料/);
  assert.match(html, /value="loading">載入中/);
  assert.match(html, /value="mock">Mock Data/);
  assert.match(html, /尚未取得本次氣象或衛星觀測資料，仍可先建立農事紀錄。/);
});

test("provides all structured experience fields and leaves the candidate unchecked", () => {
  for (const id of [
    "journalExperienceObservation",
    "journalExperienceReasoning",
    "journalExperienceAction",
    "journalExperienceOutcome",
    "journalExperienceLesson"
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  const candidate = html.match(/<input id="journalExperienceCandidate"[^>]*>/)?.[0] || "";
  assert.ok(candidate);
  assert.doesNotMatch(candidate, /\bchecked\b/);
  assert.match(html, /Sprint 1 不會真正寫入 AI 知識庫/);
});

test("shows the other operation field only when Other is selected", () => {
  assert.match(html, /id="journalOperationOtherField"[^>]*hidden/);
  assert.match(journalSource, /journalOperationOtherToggle/);
  assert.match(journalSource, /field\.hidden = !event\.target\.checked/);
  assert.match(journalSource, /journalOperationOther"\)\.focus/);
});

test("validates required context, operations and AI experience candidate fields", () => {
  const validationSource = html.slice(
    html.indexOf("function validateDecisionJournal("),
    html.indexOf("function clearJournalValidation(")
  );
  const context = vm.createContext({});
  vm.runInContext(validationSource, context);
  const valid = {
    journalMeta: { date: "2026-07-24" },
    farmContext: { farm: "示範農場", field: "", crop: "水稻" },
    farmOperations: { selected: ["巡田"], other: "" },
    operationDetails: { description: "" },
    experienceNotes: {
      farmMemoryCandidate: false,
      observation: "",
      action: "",
      lessonLearned: ""
    }
  };
  assert.equal(context.validateDecisionJournal(valid).length, 0);
  const invalid = structuredClone(valid);
  invalid.journalMeta.date = "";
  invalid.farmContext.farm = "";
  invalid.farmContext.crop = "";
  invalid.farmOperations.selected = [];
  invalid.experienceNotes.farmMemoryCandidate = true;
  assert.equal(context.validateDecisionJournal(invalid).length, 7);
});

test("keeps prototype drafts separate and writes formal journals only to the compatible farmLogs key", () => {
  assert.match(journalSource, /sessionStorage\.setItem\(DECISION_JOURNAL_DRAFT_KEY/);
  assert.match(journalSource, /sessionStorage\.removeItem\(DECISION_JOURNAL_DRAFT_KEY/);
  assert.match(journalSource, /localStorage\.setItem\("farmLogs"/);
  assert.match(journalSource, /record\.version = "2\.0"/);
  assert.doesNotMatch(journalSource, /localStorage\.setItem\("(?!farmLogs)/);
  assert.doesNotMatch(journalSource, /fetch\s*\(/);
  assert.doesNotMatch(journalSource, /FarmMemoryNdviSessions|\/api\//);
});

test("supports preview, guarded clear and safe return navigation", () => {
  assert.match(journalSource, /journalPreviewModal/);
  assert.match(journalSource, /showModal/);
  assert.match(journalSource, /confirm\("確定要清除目前表單嗎？此操作不會刪除既有農場日誌。"\)/);
  assert.match(journalSource, /document\.getElementById\("coach"\)\?\.scrollIntoView/);
  assert.match(journalSource, /escapeHtml\(error\.message\)/);
  assert.match(journalSource, /formatJournalPreviewValue/);
});

test("associates journal labels with existing controls and supports responsive layouts", () => {
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  const journalMarkup = html.slice(
    html.indexOf('<form id="decisionJournalForm"'),
    html.indexOf("</form>", html.indexOf('<form id="decisionJournalForm"'))
  );
  const labelTargets = [...journalMarkup.matchAll(/<label[^>]*\bfor="([^"]+)"/g)].map(match => match[1]);
  assert.ok(labelTargets.length >= 30);
  for (const target of labelTargets) assert.ok(ids.has(target), `missing control for label ${target}`);
  assert.match(html, /@media \(max-width: 640px\)[\s\S]*?\.journal-grid,[\s\S]*?grid-template-columns: 1fr/);
  assert.match(html, /button:focus-visible/);
  assert.match(html, /aria-live="polite"/);
});

test("normalizes legacy and structured farmLogs without mutating either record", () => {
  const normalizationSource = html.slice(
    html.indexOf("function normalizeFarmLog("),
    html.indexOf("function renderFarmLogs(")
  );
  const context = vm.createContext({});
  vm.runInContext(normalizationSource, context);

  const legacy = {
    date: "2026-07-01",
    location: "舊田區",
    crop: "水稻",
    work: "灌溉",
    note: "舊資料",
    weather: { temp: 28 }
  };
  const legacyBefore = structuredClone(legacy);
  const normalizedLegacy = context.normalizeFarmLog(legacy);
  assert.equal(normalizedLegacy.versionLabel, "舊版紀錄");
  assert.equal(normalizedLegacy.decision, "未提供");
  assert.deepEqual(legacy, legacyBefore);

  const structured = {
    version: "2.0",
    id: "journal-1",
    journalMeta: { date: "2026-07-24" },
    farmContext: { farm: "示範農場", field: "一號田", crop: "番茄" },
    farmOperations: { selected: ["巡田"], other: "" },
    operationDetails: { description: "觀察葉片" },
    farmerDecision: { finalDecision: "持續觀察" },
    experienceNotes: { lessonLearned: "先確認現場" },
    aiSnapshot: {
      weather: { state: "available", data: { temp: 30 } }
    }
  };
  const normalizedStructured = context.normalizeFarmLog(structured);
  assert.equal(normalizedStructured.versionLabel, "新版結構化紀錄");
  assert.equal(normalizedStructured.location, "示範農場／一號田");
  assert.equal(normalizedStructured.weather.temp, 30);
});

test("creates formal records with stable metadata and explicit weather availability", () => {
  const helperSource = html.slice(
    html.indexOf("function cloneJournalData("),
    html.indexOf("function journalValue(")
  );
  const context = vm.createContext({
    structuredClone,
    Date,
    Math,
    globalThis: { crypto: { randomUUID: () => "fixed-id" } },
    getFarmLogs: () => [],
    localStorage: { setItem() {} }
  });
  vm.runInContext(helperSource, context);
  const draft = {
    journalMeta: { createdAt: "2026-07-24T00:00:00.000Z" },
    aiSnapshot: { state: "empty" }
  };
  const withWeather = context.createFormalFarmLogRecord(draft, { temp: 31 });
  assert.equal(withWeather.version, "2.0");
  assert.equal(withWeather.id, "journal-fixed-id");
  assert.equal(withWeather.aiSnapshot.weather.state, "available");
  assert.equal(withWeather.aiSnapshot.weather.data.temp, 31);
  assert.equal(draft.version, undefined);

  const withoutWeather = context.createFormalFarmLogRecord(draft, null);
  assert.equal(withoutWeather.aiSnapshot.weather.state, "empty");
  assert.equal(withoutWeather.aiSnapshot.weather.data, null);
});

test("appends a new structured record without overwriting existing farmLogs", () => {
  const appendSource = html.slice(
    html.indexOf("function appendFarmLogRecord("),
    html.indexOf("function journalValue(")
  );
  const existing = [{ date: "2026-07-01", work: "舊紀錄" }];
  let written = null;
  const context = vm.createContext({
    cloneJournalData: structuredClone,
    getFarmLogs: () => structuredClone(existing),
    localStorage: {
      setItem(key, value) {
        assert.equal(key, "farmLogs");
        written = JSON.parse(value);
      }
    }
  });
  vm.runInContext(appendSource, context);
  context.appendFarmLogRecord({ id: "journal-new", version: "2.0" });
  assert.equal(written.length, 2);
  assert.equal(written[0].id, "journal-new");
  assert.equal(written[1].work, "舊紀錄");
});

test("clear form and clear history have separate storage boundaries", () => {
  const clearFormSource = html.slice(
    html.indexOf("function clearDecisionJournalForm("),
    html.indexOf("function initializeDecisionJournal(")
  );
  const clearHistorySource = html.slice(
    html.indexOf("function clearFarmLogs("),
    html.indexOf("function openGptCoach(")
  );
  assert.match(clearFormSource, /sessionStorage\.removeItem\(DECISION_JOURNAL_DRAFT_KEY\)/);
  assert.doesNotMatch(clearFormSource, /localStorage|farmLogs/);
  assert.match(clearHistorySource, /localStorage\.removeItem\("farmLogs"\)/);
  assert.doesNotMatch(clearHistorySource, /sessionStorage|removeItem\("(?!farmLogs)/);
  assert.match(clearHistorySource, /會刪除所有已保存的農場日誌/);
});

test("keeps PNG and PDF exports available through normalized records", () => {
  assert.match(html, /onclick="exportLatestLogImage\(\)"/);
  assert.match(html, /onclick="exportLatestLogPdf\(\)"/);
  assert.match(html, /onclick="exportFarmLogImage\(\$\{index\}\)"/);
  assert.match(html, /onclick="exportFarmLogPdf\(\$\{index\}\)"/);
  const exportSource = html.slice(
    html.indexOf("async function exportFarmLogImage("),
    html.indexOf("async function renderShareCardToCanvas(")
  );
  assert.equal((exportSource.match(/normalizeFarmLog\(record\)/g) || []).length, 2);
});

test("supports native dialog cancel and restores focus without blocking Escape", () => {
  const initializationSource = html.slice(
    html.indexOf("function initializeDecisionJournal("),
    html.indexOf("function getFarmLogs(")
  );
  assert.match(initializationSource, /addEventListener\("cancel"/);
  assert.match(initializationSource, /addEventListener\("close"/);
  assert.match(initializationSource, /previewModal\.close\(\)/);
  assert.match(initializationSource, /target\?\.focus\(\)/);
  assert.doesNotMatch(initializationSource, /preventDefault/);
});

test("retains existing integrations and keeps all inline JavaScript syntactically valid", () => {
  assert.match(html, /\/api\/v1\/satellite\/search/);
  assert.match(html, /\/api\/v1\/ndvi\/statistics/);
  assert.match(html, /\/api\/v1\/ndvi\/image/);
  assert.match(html, /id="fieldBoundary"/);
  assert.match(html, /id="iotCenter"/);
  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
  scripts.forEach((source, index) => {
    assert.doesNotThrow(() => new vm.Script(source, { filename: `index-inline-${index}.js` }));
  });
});
