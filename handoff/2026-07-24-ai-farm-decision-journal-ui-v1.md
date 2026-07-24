# AI Farm Decision Journal v1.0 — Sprint 1 Handoff

## 1. Project Context

- Repository：`r91628120/ai-agri-weather-coach`
- 正式應用：`ai-agri-weather-coach/index.html`
- Branch：`feature/ai-farm-decision-journal-ui-v1`
- 本次為 AIAKOS Enterprise Release Sprint 的前端 UI Prototype。
- 根目錄 `index.html` 是 GitHub Pages 導向入口，本次未修改。

## 2. Product Positioning

正式名稱為「AI 農場決策日誌｜AI Farm Decision Journal」。它保存完整農業決策循環：

```text
Facts
→ AI Analysis
→ Farmer Decision
→ Farm Operations
→ Outcome
→ Experience
```

本階段不建立 AI Brain 或 Farm Memory，只建立可供 Review 的前端原型。

## 3. Existing Journal Audit

原有 `#farmLog` 為「AI 農場經營日誌系統」，使用 `farmLogs` localStorage key，主要欄位為日期、農事工作與單一日誌內容，另可附加氣象／NDVI 快照並匯出 PNG/PDF。

本次處理方式：

- 原位重構同一個 `#farmLog`，沒有新增競爭頁面。
- 保留既有 `farmLogs` 資料與呈現，改放在同區塊的折疊歷史清單。
- 新版表單是唯一輸入入口；正式儲存以 `version: "2.0"` append 至既有 `farmLogs`。
- 舊版 flat record 與新版 structured record 透過 normalization adapter 同時顯示，不批次遷移舊資料。
- PNG／PDF 舊匯出引擎與入口保留，匯出前共用相同 normalization。
- 既有資料呈現補上安全 escaping 與損壞 JSON 防護。

## 4. Files Changed

- `ai-agri-weather-coach/index.html`
- `ai-agri-weather-coach/workers/satellite-api/tests/farm-decision-journal.test.js`
- `handoff/2026-07-24-ai-farm-decision-journal-ui-v1.md`

## 5. UI Structure

1. Journal Header
2. Farm Information
3. AI Analysis Snapshot
4. Farmer Decision
5. Farm Operations
6. Operation Details
7. Outcome and Follow-up
8. AI Experience Notes
9. Media and Attachments
10. Save／Draft Action Bar

另保留資料品質提醒與既有日誌唯讀清單。桌面採多欄卡片，Mobile 在 640px 以下切換單欄。

## 6. Interaction Flow

- 狀態可在新增紀錄、草稿、待追蹤、已完成間切換；僅為 UI prototype。
- AI Snapshot 可切換尚無資料、載入中、Mock Data；全部唯讀且不呼叫 API。
- Farmer Decision 與 AI Recommendation 分離。
- 農事作業可複選；選擇「其他」時顯示補充欄位。
- 「值得保存為 AI 經驗」預設未勾選，勾選後啟用結構化必填驗證。
- 儲存草稿只寫入當前分頁 `sessionStorage`。
- 儲存日誌通過同一組驗證後，正式 append 至 `localStorage.farmLogs`。
- 預覽使用原生 dialog，所有使用者文字經 HTML escaping。
- 清除表單需 `confirm()`，只清除輸入與目前草稿。
- 清除全部歷史日誌是獨立危險操作，二次確認後只刪除 `farmLogs`。
- 返回上一頁只捲動至既有 Coach 區塊，不改變瀏覽導覽。

## 7. Draft Data Model

```json
{
  "version": "1.0-prototype",
  "journalMeta": {
    "source": "manual-ui-prototype",
    "date": "YYYY-MM-DD",
    "time": "HH:mm",
    "recorder": "",
    "createdAt": "ISO-8601",
    "updatedAt": "ISO-8601"
  },
  "farmContext": {
    "source": "manual-placeholder",
    "farm": "",
    "field": "",
    "crop": "",
    "variety": "",
    "growthStage": ""
  },
  "aiSnapshot": {
    "source": "not-connected",
    "readonly": true,
    "state": "empty",
    "facts": {},
    "recommendation": ""
  },
  "farmerDecision": {
    "source": "human-input",
    "adoption": "undecided",
    "reason": "",
    "constraints": "",
    "finalDecision": "",
    "decisionMaker": ""
  },
  "farmOperations": {
    "source": "human-input",
    "selected": [],
    "other": ""
  },
  "operationDetails": {
    "source": "human-input",
    "description": "",
    "materialsOrEquipment": "",
    "quantityOrDose": "",
    "scope": "",
    "operationTime": "",
    "anomalies": "",
    "safetyNotes": ""
  },
  "outcome": {
    "source": "human-input",
    "expected": {},
    "actual": {},
    "followUp": {}
  },
  "experienceNotes": {
    "source": "human-input-unverified",
    "observation": "",
    "reasoning": "",
    "action": "",
    "outcome": "",
    "lessonLearned": "",
    "farmMemoryCandidate": false,
    "verified": false
  },
  "media": {
    "source": "prototype-placeholder",
    "items": [],
    "uploadEnabled": false
  },
  "status": "new"
}
```

AI 原始建議、人類決策、作業、成果與經驗維持獨立欄位，不使用單一 notes 承載全部資料。

## 8. Validation Rules

預覽或儲存草稿前需要：

- 紀錄日期。
- 農場或田區至少一項。
- 作物。
- 至少一項 Farm Operation，或填寫今日作業說明。
- 選擇「其他」時需填寫其他作業。
- 勾選 AI 經驗候選時，需填 Observation、Action、Lesson Learned。

Reasoning 可留空，也可填「尚未確認」或「不確定」。

## 9. Accessibility Notes

- 所有主要欄位具明確 label／for 關聯。
- Radio、Checkbox 與 Select 使用原生控制項，可使用鍵盤操作。
- 提供 `:focus-visible`／`:focus-within` 樣式。
- 驗證摘要使用 `role="alert"`、`aria-invalid` 並可聚焦。
- 草稿狀態與快照狀態使用 `aria-live`／`aria-busy`。
- Modal 使用原生 `dialog` 與可辨識關閉按鈕。
- 狀態同時使用文字，不依賴顏色作為唯一提示。

## 10. Mock Data 說明

- 預設為「尚無資料」。
- 「載入中」只展示 Skeleton 狀態。
- 「Mock Data」明確標示僅供 UI Review。
- Mock 內容不聲稱為正式農業建議，不呼叫 Weather、Satellite 或 Observation API。

## 11. Legacy Compatibility

新版 AI Farm Decision Journal 維持唯一主要輸入入口，沒有恢復第二套舊表單。既有 `farmLogs` key、歷史清單、氣象快照、PNG／PDF 匯出與獨立清除歷史能力均保留。

## 12. farmLogs Versioning

- 舊版紀錄：沒有固定版本，維持原始 flat record。
- 新版正式紀錄：`version: "2.0"`，包含穩定唯一 `id`、`createdAt` 與 `updatedAt`。
- 正式保存先讀取既有陣列再 append，不覆寫其他紀錄。
- 不建立第二個正式日誌 key，也不在未經確認下改寫舊資料。

## 13. Old/New Record Normalization

`normalizeFarmLog(record)` 以唯讀 adapter 將舊版與新版資料轉為歷史卡片／匯出的共同顯示模型。舊紀錄缺少 Decision、Experience 或 Weather 時顯示「舊版紀錄」或「未提供」，不偽造資料；原始 localStorage 內容不被修改。

## 14. Formal Save vs Draft Save

- 「儲存草稿」：寫入 `sessionStorage.aiakosDecisionJournalPrototypeDraftV1`。
- 「儲存日誌」：執行相同驗證，建立 `version: "2.0"` structured record，寫入 `localStorage.farmLogs` 並立即刷新歷史清單。
- 兩者不會寫入 Farm Memory、AI Brain、後端或其他 localStorage key。

## 15. Weather Snapshot Compatibility

正式保存沿用頁面既有 `latestWeatherSnapshot`。有資料時深拷貝至 `aiSnapshot.weather.data`，並標示 `state: "available"`；沒有資料時保存 `state: "empty"`、`data: null`，不捏造氣象內容，也不修改 Weather API 或既有分析流程。

## 16. History Deletion Safety

「清除表單」只 reset 目前輸入並刪除 prototype draft。「清除全部歷史日誌」位於歷史區的危險操作，確認文字明確說明會刪除所有已保存日誌，且實作只執行 `localStorage.removeItem("farmLogs")`。

## 17. Export Compatibility

歷史區保留「匯出最新日誌 PNG／PDF」入口，各筆紀錄也保留 PNG／PDF 操作。舊版與新版紀錄都先經 `normalizeFarmLog()`，再沿用既有分享卡與匯出引擎，沒有建立第二套匯出資料來源。

## 18. Escape Modal Verification

原生 dialog 新增 `cancel` 事件處理且未呼叫 `preventDefault()`，允許 Escape 關閉；`close` 事件會把焦點還給原觸發控制項或預覽按鈕。自動測試覆蓋 cancel／close 邏輯，瀏覽器人工結果記錄於 Tests Performed。

## 19. Tests Performed

自動檢查：

- `npm test`：81/81 通過，其中 16 個 Journal UI／相容性／資料結構測試。
- `npm run lint`：通過。
- `npm run check`：Cloudflare Worker dry-run 通過；沒有部署。
- `git diff --check`：通過。
- Inline JavaScript syntax：通過。

本機 UAT（`http://127.0.0.1:8080/ai-agri-weather-coach/`）：

- Desktop：通過。
- Mobile 390px：通過，`scrollWidth === clientWidth`，無水平捲動。
- Farm Operation「其他」欄位：通過。
- Farmer Decision 切換：通過。
- AI Experience 候選驗證：通過。
- 預覽 dialog：通過。
- 關閉按鈕可關閉 dialog，且焦點返回預覽按鈕：通過。
- 預覽 Modal：人工驗證通過，可正常操作；中文顯示正常且沒有亂碼。
- 新版正式儲存：通過；成功訊息顯示，重新整理後紀錄仍存在。
- 新版結構化紀錄歷史顯示：通過。
- 舊／新混合歷史：adapter 自動測試通過；本機 UAT 未直接修改 localStorage 注入舊資料。
- 清除表單：通過；目前輸入清空，既有 `farmLogs` 歷史保留。
- 清除全部歷史：通過；獨立 confirm 後歷史總數立即歸零。
- PNG／PDF：人工驗證均可成功下載，中文顯示正常。現有匯出內容仍沿用舊版「AI 農場經營日誌」模板，尚未呈現新版 AI Farm Decision Journal 的完整結構化欄位；本項不阻擋 Sprint 1。
- 空氣象快照：通過；歷史顯示明確空狀態。
- 空資料／載入中／Mock Data：通過。
- 長文字換行：通過。
- 原生鍵盤焦點與控制項：通過。
- 重新載入後候選預設未勾選：通過。
- Console：無本次功能錯誤；只有 GoatCounter 在 localhost 不計數的預期 warning。
- Network：頁面與 `townships.json` 均為 HTTP 200。
- 既有 Satellite／NDVI／Worker tests 無退化。

## 20. Known Issues

- 草稿僅存於目前分頁；重新整理後不做 Session Restore。
- 原型沒有日誌查詢、編輯、正式追蹤提醒或版本衝突處理。
- Media 區只提供「尚未開放」預留。
- 舊版紀錄維持原始 flat record，不做未授權的批次 migration。

## 21. Deferred Items

- 正式 API、後端與資料庫。
- AI Brain／Farm Memory 寫入。
- Weather、NDVI、Risk、AI Recommendation 正式 API 串接。
- 正式附件上傳、雲端同步、LINE、MQTT 與語音。
- 將 PNG／PDF 匯出模板升級為新版 AI Farm Decision Journal 格式。

## 22. Sprint 2 Integration Plan

只列規劃，不在本次實作：

1. Field 資料帶入。
2. Weather／NDVI／Risk／AI Recommendation 摘要來源契約。
3. Local／Cloud Storage 選型與 migration。
4. 圖片附件與媒體儲存策略。
5. 日誌查詢、編輯與 Follow-up。
6. Export 格式與版面升級。
7. Farm Memory Candidate 審核流程。

## 23. Safety Boundaries

- 未修改 Worker Public API。
- 未修改 Weather、Satellite、Observation、GIS、地圖或 Field Management 核心邏輯。
- 未建立正式資料庫或後端。
- 未寫入 Farm Memory 或 AI Brain。
- 未加入第三方套件。
- 未提供農藥、肥料或安全用量建議。
- 未修改根目錄 GitHub Pages 導向入口。

## 24. Git Status

- Branch：`feature/ai-farm-decision-journal-ui-v1`
- 尚未 Commit、Push、建立 PR 或 Merge。
- 最終 `git status --short` 與 diff stat 以交付回報為準。

## 25. Next Recommended Action

人工 Review Sprint 1 的資訊層級、欄位語意、Mobile 可讀性與資料模型草案。確認後再另行授權 Sprint 2；本分支不自行開始整合。

## 26. Simplified Farm Journal v2

### 為何簡化

將主要流程縮減為農民約一分鐘可完成的操作：選擇農場卡片、勾選農事、填寫一段作業內容並儲存。農民決策、成果追蹤與五段式 AI Experience 不再顯示於主要填寫流程。

### 新操作流程

1. 建立或選擇農場／田區卡片。
2. 勾選「今天做了什麼」。
3. 填寫單一「作業內容」。
4. 視需要展開一個經驗／提醒欄位。
5. 檢查田區環境摘要後儲存日誌。

### Farm Profile Storage

- localStorage key：`aiakosFarmProfilesV1`
- 支援多張卡片、修改、選取與二次確認刪除。
- 與既有 `farmLogs`、農地、NDVI、MQTT／IoT 儲存完全分離。

### GPT 連結方式

「複製分析資料」只透過 Clipboard API 複製純文字；「開啟 AI農業氣象教練」以新分頁與 `noopener noreferrer` 開啟既有 GPT 網址。網站不呼叫 OpenAI API、不傳送內容、不保存 API key。

### 保留的相容功能

- 舊版及新版 `farmLogs` 讀取與正式 append 儲存。
- 當下氣象與最近 NDVI 快照。
- 歷史列表、PNG／PDF 舊版匯出與獨立清除全部歷史。
- Worker、Weather、Satellite、NDVI、GIS 與 Field Management 公開介面不變。

### 未完成事項

- Farm Profile 後端同步與跨裝置資料。
- 草稿自動恢復。
- PNG／PDF 新版結構化模板。
- Farm Memory／AI Brain／正式 AI API 整合。
