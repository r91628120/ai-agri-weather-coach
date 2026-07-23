# Farm Memory NDVI Session Data Model v1 Handoff

## 本次範圍

- 建立 schemaVersion `1.0` 的 NDVI Session 資料模型。
- 建立獨立 localStorage Repository，key 為 `aiaikosFarmMemoryNdviSessionsV1`。
- 加入深拷貝、資料驗證、去重、安全解析與損壞資料隔離。
- 未新增主要 UI、Session Save／Restore、Worker API 或部署。

## 修改檔案

- `ai-agri-weather-coach/js/farm-memory-session.js`
- `ai-agri-weather-coach/workers/satellite-api/tests/farm-memory-session.test.js`
- `docs/FARM-MEMORY-NDVI-SESSION-V1.md`
- `handoff/2026-07-23-farm-memory-ndvi-session-model-v1-handoff.md`

## 相容性與安全

- 既有 Farm Memory 農地、NDVI records 與 selected field localStorage keys 保持不變。
- 不保存 Blob URL、Base64 PNG、Secret、Token 或 Authorization 資料。
- 損壞 JSON 安全回復為空陣列；單筆損壞 Session 不影響其他資料。

## 驗證

- `npm test`：82/82 通過（新增 17 個 Farm Memory Session 測試，既有 65 個測試無退化）。
- `npm run lint`：通過。
- `git diff --check`：通過。
- `node --check ai-agri-weather-coach/js/farm-memory-session.js`：通過。

## Git

- Branch：`feature/farm-memory-ndvi-session-model-v1`
- Commit：`feat: add Farm Memory NDVI session data model`（本次提交）。
- Draft PR：以本分支建立，base 為 `main`。

## 下一階段

Session Save UI。不得在本 PR 中提前實作 Session Restore 或主要 UI。
