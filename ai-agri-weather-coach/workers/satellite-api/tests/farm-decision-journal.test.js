import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const html = await readFile(new URL("../../../index.html", import.meta.url), "utf8");
const journalSource = html.slice(
  html.indexOf("const DECISION_JOURNAL_DRAFT_KEY"),
  html.indexOf("function getFarmLogs()")
);

test("keeps one simplified AI Farm Decision Journal as the primary journal", () => {
  assert.equal((html.match(/id="farmLog"/g) || []).length, 1);
  assert.equal((html.match(/id="decisionJournalForm"/g) || []).length, 1);
  assert.match(html, /約 1 分鐘完成/);
  assert.match(html, /選擇田區、勾選今天的農事、簡單補充後即可儲存/);
  assert.match(html, /既有 AI 農場經營日誌紀錄（保留且不覆寫）/);
});

test("provides persistent multi-profile farm cards using an isolated key", () => {
  assert.match(journalSource, /FARM_PROFILE_STORAGE_KEY = "aiakosFarmProfilesV1"/);
  assert.match(journalSource, /localStorage\.getItem\(FARM_PROFILE_STORAGE_KEY\)/);
  assert.match(journalSource, /localStorage\.setItem\(FARM_PROFILE_STORAGE_KEY/);
  assert.match(html, /id="journalProfileList"/);
  assert.match(html, /id="journalAddProfileButton"/);
  assert.match(html, /id="journalEditProfileButton"/);
  assert.match(html, /id="journalDeleteProfileButton"/);
  assert.match(journalSource, /profiles\.push\(cloneJournalData\(profile\)\)/);
});

test("farm profile editor contains only the required profile fields", () => {
  for (const id of [
    "journalProfileName",
    "journalFarm",
    "journalField",
    "journalCrop",
    "journalVariety",
    "journalStage",
    "journalRecorder"
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /儲存農場資料/);
  assert.match(html, /取消修改/);
  assert.match(journalSource, /selectedJournalProfileId/);
  assert.match(journalSource, /is-selected/);
});

test("requires a selected profile before entry panels and formal save become available", () => {
  for (const id of [
    "journalOperationsPanel",
    "journalDetailsPanel",
    "journalExperienceSimplePanel",
    "journalEnvironmentPanel",
    "journalActionBar"
  ]) {
    assert.match(html, new RegExp(`id="${id}"[^>]*hidden`));
  }
  assert.match(journalSource, /setJournalEntryVisibility\(Boolean\(selectedProfile\)\)/);
  assert.match(journalSource, /if \(!draft\.farmContext\.profileId\)/);
});

test("keeps all eighteen touch-friendly farm operation choices", () => {
  const operationValues = [...html.matchAll(/name="journalOperation" value="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(operationValues, [
    "播種", "育苗", "定植", "灌溉", "排水", "施肥", "用藥", "病蟲害防治", "除草",
    "整枝或修剪", "土壤管理", "巡田", "取樣或檢測", "採收", "分級或包裝", "設備維護",
    "災害應變", "其他"
  ]);
  assert.match(html, /請填寫其他農事作業/);
});

test("other operation toggles visibility without clearing entered text", () => {
  const initializationSource = html.slice(
    html.indexOf("function initializeDecisionJournal("),
    html.indexOf("function getFarmLogs()")
  );
  assert.match(initializationSource, /field\.hidden = !event\.target\.checked/);
  assert.match(initializationSource, /journalOperationOther"\)\.focus/);
  assert.doesNotMatch(initializationSource, /journalOperationOther"\)\.value = ""/);
});

test("replaces complex operation details with one primary textarea", () => {
  assert.match(html, /可以簡單記錄：/);
  assert.match(html, /id="journalOperationDescription"/);
  assert.match(html, /上午巡田後進行灌溉/);
  assert.match(html, /不提供農藥或肥料劑量建議/);
  assert.match(html, /aria-labelledby="journalOutcomeHeading" hidden/);
  assert.match(html, /aria-labelledby="journalDecisionHeading" hidden/);
});

test("uses one optional collapsed experience note and unchecked candidate", () => {
  assert.match(html, /<details id="journalExperienceDetails">/);
  assert.match(html, /補充今天的經驗或提醒（選填）/);
  assert.match(html, /id="journalExperienceNote"/);
  const candidate = html.match(/<input id="journalExperienceSimpleCandidate"[^>]*>/)?.[0] || "";
  assert.ok(candidate);
  assert.doesNotMatch(candidate, /\bchecked\b/);
  assert.match(html, /不會寫入 Farm Memory 或 AI 知識庫/);
});

test("builds a simplified compatible record with weather and NDVI snapshots", () => {
  assert.match(journalSource, /version: "2\.1-simplified"/);
  assert.match(journalSource, /profileId: profile\?\.id/);
  assert.match(journalSource, /description: journalValue\("journalOperationDescription"\)/);
  assert.match(journalSource, /note: experienceNote/);
  assert.match(journalSource, /latestWeatherSnapshot/);
  assert.match(journalSource, /latestNdviSnapshot/);
  assert.match(journalSource, /source: "legacy-compatibility"/);
  assert.match(journalSource, /record\.version = "2\.1"/);
});

test("validates date, selected farm profile, work and other operation", () => {
  const validationSource = html.slice(
    html.indexOf("function validateDecisionJournal("),
    html.indexOf("function clearJournalValidation(")
  );
  const context = vm.createContext({});
  vm.runInContext(validationSource, context);
  const valid = {
    journalMeta: { date: "2026-07-24" },
    farmContext: { profileId: "farm-profile-1" },
    farmOperations: { selected: ["巡田"], other: "" },
    operationDetails: { description: "" }
  };
  assert.equal(context.validateDecisionJournal(valid).length, 0);
  const invalid = structuredClone(valid);
  invalid.journalMeta.date = "";
  invalid.farmContext.profileId = "";
  invalid.farmOperations.selected = ["其他"];
  assert.equal(context.validateDecisionJournal(invalid).length, 3);
});

test("keeps draft and formal storage separate without overwriting farmLogs", () => {
  assert.match(journalSource, /sessionStorage\.setItem\(DECISION_JOURNAL_DRAFT_KEY/);
  assert.match(journalSource, /localStorage\.setItem\("farmLogs"/);
  assert.match(journalSource, /logs\.unshift\(cloneJournalData\(record\)\)/);
  assert.doesNotMatch(journalSource, /localStorage\.setItem\("(?!farmLogs)/);
});

test("renders a read-only field environment summary without mock AI analysis", () => {
  assert.match(html, /田區環境摘要｜Field Environment Summary/);
  for (const label of [
    "選定農場", "田區", "作物", "生育階段", "今日氣象", "溫度", "濕度", "雨量", "風速",
    "最近一次 NDVI", "衛星觀測日期", "今日農事作業", "作業內容"
  ]) {
    assert.match(journalSource, new RegExp(`"${label}"`));
  }
  const summarySource = html.slice(
    html.indexOf("function updateJournalEnvironmentSummary("),
    html.indexOf("function saveDecisionJournalDraft(")
  );
  assert.doesNotMatch(summarySource, /fetch\s*\(|\/api\//);
  assert.match(summarySource, /尚無資料/);
});

test("copies a plain-text GPT prompt and opens the existing coach safely", () => {
  assert.match(html, /id="journalCopyAnalysisButton"/);
  assert.match(html, /id="journalOpenGptButton"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
  assert.match(journalSource, /navigator\.clipboard\.writeText\(buildJournalAnalysisText\(\)\)/);
  assert.match(journalSource, /分析資料已複製，請前往 AI農業氣象教練貼上/);
  assert.match(journalSource, /請用農民容易理解的方式說明/);
  assert.doesNotMatch(journalSource, /OpenAI|apiKey|Authorization/);
});

test("clear current content preserves profiles and farmLogs while profile deletion is isolated", () => {
  const clearFormSource = html.slice(
    html.indexOf("function clearDecisionJournalForm("),
    html.indexOf("function initializeDecisionJournal(")
  );
  assert.match(clearFormSource, /sessionStorage\.removeItem\(DECISION_JOURNAL_DRAFT_KEY\)/);
  assert.doesNotMatch(clearFormSource, /localStorage\.removeItem|farmLogs/);
  const deleteProfileSource = html.slice(
    html.indexOf("function deleteSelectedJournalFarmProfile("),
    html.indexOf("function journalValue(")
  );
  assert.match(deleteProfileSource, /saveJournalFarmProfiles\(profiles\)/);
  assert.doesNotMatch(deleteProfileSource, /localStorage\.removeItem|localStorage\.setItem\("farmLogs"/);
});

test("retains legacy farmLogs normalization, history deletion and PNG or PDF exports", () => {
  assert.match(html, /function normalizeFarmLog\(/);
  assert.match(html, /startsWith\("2\."\)/);
  assert.match(html, /localStorage\.removeItem\("farmLogs"\)/);
  assert.match(html, /onclick="exportLatestLogImage\(\)"/);
  assert.match(html, /onclick="exportLatestLogPdf\(\)"/);
  assert.match(html, /onclick="exportFarmLogImage\(\$\{index\}\)"/);
  assert.match(html, /onclick="exportFarmLogPdf\(\$\{index\}\)"/);
});

test("keeps dialog accessibility, responsive layout and inline JavaScript syntax", () => {
  assert.match(journalSource, /addEventListener\("cancel"/);
  assert.match(journalSource, /addEventListener\("close"/);
  assert.match(html, /@media \(max-width: 640px\)/);
  assert.match(html, /\.journal-profile-list/);
  assert.match(html, /button:focus-visible/);
  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
  scripts.forEach((source, index) => {
    assert.doesNotThrow(() => new vm.Script(source, { filename: `index-inline-${index}.js` }));
  });
});

test("does not modify Worker, Weather, Satellite, NDVI, GIS or field integrations", () => {
  assert.match(html, /\/api\/v1\/satellite\/search/);
  assert.match(html, /\/api\/v1\/ndvi\/statistics/);
  assert.match(html, /\/api\/v1\/ndvi\/image/);
  assert.match(html, /id="fieldBoundary"/);
  assert.match(html, /id="iotCenter"/);
  assert.match(html, /id="ndviGisViewer"/);
});
