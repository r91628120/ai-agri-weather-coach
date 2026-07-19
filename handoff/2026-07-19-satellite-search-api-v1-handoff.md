# AIAKOS Satellite Search API v1.0 Handoff

## 本次目標

在 `feature/satellite-search-api-v1` 建立真實 CDSE Sentinel Hub Catalog/STAC 搜尋 API，讓使用者以農地 Polygon 或 MultiPolygon 搜尋 Sentinel-2 L2A 可用觀測，並在既有 NDVI UI 中選用觀測日期。

## 已完成功能

- `POST /api/v1/satellite/search`
- 共用既有 CDSE OAuth token provider、JSON body 安全限制及 Polygon/MultiPolygon 驗證
- 日期、最大雲量（預設 30，0–100）及 limit（預設 10，1–50）驗證
- CDSE 401 token refresh、429/5xx retry、timeout 與安全錯誤映射
- 回傳 Sentinel-2 平台、日期、雲量、L2A 層級與建議觀測
- 依日期新到舊排序；相同日期時優先較低雲量
- 成功回應包含 `resultCount`，且固定等於 `observations.length`
- 無結果時 HTTP 200、`resultCount: 0`、空陣列、`recommendedObservation: null`
- 前端新增「🔎 搜尋 Sentinel-2 可用觀測」、載入/成功/空結果/錯誤狀態、含產品 ID 的觀測卡片及「使用此日期查詢 NDVI」
- 明確區分 Esri 參考底圖、Sentinel-2 觀測資料、Sentinel-2 NDVI 統計與後續 NDVI 影像

## 修改檔案

- `ai-agri-weather-coach/index.html`
- `workers/satellite-api/src/config/satellite.js`
- `workers/satellite-api/src/index.js`
- `workers/satellite-api/src/routes/ndvi-statistics.js`
- `workers/satellite-api/src/routes/satellite-search.js`
- `workers/satellite-api/src/schemas/ndvi-statistics-schema.js`
- `workers/satellite-api/src/schemas/satellite-request-schema.js`
- `workers/satellite-api/src/schemas/satellite-search-schema.js`
- `workers/satellite-api/src/services/satellite/catalog-service.js`
- `workers/satellite-api/src/utils/json-body.js`
- `workers/satellite-api/tests/satellite-search.test.js`
- `workers/satellite-api/tests/fixtures/cdse-catalog-response.json`
- `workers/satellite-api/tests/fixtures/cdse-catalog-empty-response.json`
- `workers/satellite-api/tests/fixtures/field-feature.geojson`
- `workers/satellite-api/docs/openapi.yaml`
- `workers/satellite-api/docs/API-ROADMAP.md`
- `workers/satellite-api/docs/SATELLITE-ARCHITECTURE.md`
- `workers/satellite-api/docs/CHANGELOG.md`
- `workers/satellite-api/docs/SATELLITE-SEARCH-API.md`

## 測試結果

- `npm test`：26/26 通過（PR #2 第一輪 Review 修正後）
- `npm run lint`：通過
- `npm run check`：Wrangler dry-run 通過
- `git diff --check`：通過
- 前端 inline JavaScript 語法測試：通過
- 真實 CDSE OAuth 狀態：`connected=true`
- 真實 Search API：HTTP 200，回傳非空觀測清單及非空建議觀測
- 本機瀏覽器端到端：成功選用匯入的 Polygon；最終查詢顯示 8 筆真實觀測，無 CORS 與 console error
- UI 建議觀測：2026-07-08、Sentinel-2C、雲量 23.6%
- UI 亦驗證既有真實 NDVI：平均 0.1506、有效像素比例 100.0%、統計期間 2026-07-08T00:00:00Z 至 2026-07-09T00:00:00Z

## API 測試方式

在 Worker 本機開發環境啟動後，以 `Content-Type: application/json` POST 農地 geometry、日期、雲量與 limit 至 `/api/v1/satellite/search`。確認 HTTP 200、`resultCount === observations.length`、`observations` 為陣列、`recommendedObservation` 非空；空查詢結果仍應為 HTTP 200 且 `resultCount: 0`。

## 尚未完成項目

- `POST /api/v1/ndvi/image`：HTTP 501
- `GET /api/v1/ndvi/history`：HTTP 501
- `POST /api/v1/ai/analyze`：HTTP 501
- NDVI 影像、歷史趨勢與 AI 分析仍屬後續版本；本次 Satellite Search API v1.0 已正式結案

## 已知限制

- Catalog API 僅搜尋中繼資料，不下載 Sentinel-2 影像，也不計算 NDVI。
- 雲量是觀測產品的 STAC 中繼資料，不代表農地 Polygon 內每一像素的局部雲量。
- 推薦策略是最新日期優先，相同日期再取較低雲量；不是農業適用性的完整評分。

## 部署與環境設定

- Branch：`feature/satellite-search-api-v1`
- Draft PR：#2（建立後等待 ChatGPT Review，不可 Merge）
- 本機 Worker：`http://127.0.0.1:8787`
- 正式 Worker：`https://aiaikos-satellite-api.r91628120.workers.dev`
- 正式部署時間：2026-07-19 12:24:23 +08:00
- 部署來源 Commit：`bc828e43ac193a3dd0e3f111ea5fef07faa2f050`
- Cloudflare Worker Version ID：`aa5f0f80-7e20-4fae-b743-688033918b99`
- Worker 僅從環境 Secrets 取得 CDSE OAuth 憑證；文件、程式碼、測試與紀錄均不得包含 Secret、Access Token 或 Authorization header 值

## 安全檢查結果

- Client 傳入 OAuth/Token 欄位會被拒絕
- Client Authorization header 會被拒絕
- 上游錯誤不回傳原始 response body、stack、Secret 或 Access Token
- 自動測試驗證成功及錯誤資料不包含測試 token
- 本次驗收未讀取、輸出或記錄任何 Secret 或 Access Token

## PR #2 第一輪 Review 修正

- 成功回應新增 `resultCount`，並以測試驗證一般結果及空結果分別等於 3 與 0。
- OpenAPI 與 Satellite Search API 文件已補充 `resultCount === observations.length` 契約。
- 前端按鈕及狀態統一採用「搜尋可用觀測／搜尋觀測資料」，避免暗示本版會顯示圖片。
- 觀測卡片新增產品 ID；畫面採截短文字，完整值保留於 `title`，兩者皆經 `escapeHtml`，並以 `overflow-wrap:anywhere` 保護手機版排版。
- 修正後 `npm test`、`npm run lint`、`npm run check`、`git diff --check` 與前端 JavaScript 語法檢查均通過。
- 第一輪 Review 階段未部署；第二輪 Review 通過後才依核准進行正式部署。PR #2 仍未 Merge。

## 正式 Worker 部署與驗收

- 部署命令：`npm run deploy`
- Worker Version ID：`aa5f0f80-7e20-4fae-b743-688033918b99`
- `GET /api/v1/health`：HTTP 200，成功狀態正常。
- `GET /api/v1/cdse/status`：HTTP 200，`connected=true`。
- `POST /api/v1/satellite/search`：HTTP 200，`resultCount: 4`，且等於 `observations.length: 4`。
- 建議觀測：2026-07-08、Sentinel-2C、雲量 23.65%；產品 ID 為非空有效字串。
- 空結果：以 2027-06-01 查詢，HTTP 200、`resultCount: 0`、空觀測陣列、`recommendedObservation: null`。
- NDVI 回歸：HTTP 200，`latestObservation` 非空，mean 0.542049467563629，有效像素比例 1，統計期間 2026-07-08T00:00:00Z 至 2026-07-09T00:00:00Z。
- 僅確認遠端 Secret 名稱存在，未讀取、輸出或記錄 Secret、Access Token 或 Authorization Header。
- 此段為 Merge 前正式 Worker 驗收結果；PR #2 後續已完成 Merge，詳見結案章節。

## 下一步

1. 規劃 `POST /api/v1/ndvi/image` 的安全影像輸出與快取策略。
2. 規劃 NDVI 歷史序列的持久化、查詢範圍及資料保留政策。
3. 規劃 AI 分析端點整合衛星、氣象與 Farm Memory 的輸入契約。

## PR Merge、GitHub Pages 與正式 UI 結案

- PR #2 已由 Draft 改為 Ready for review，並於 2026-07-19 Merge 至 `main`。
- Merge Commit SHA：`c24b490cf6e75669114b118099554019c50842f6`。
- GitHub Pages workflow run：`29674394813`，部署 Commit `c24b490cf6e75669114b118099554019c50842f6`，結果 success。
- 正式網站：`https://r91628120.github.io/ai-agri-weather-coach/`。
- 正式 UI 顯示「🔎 搜尋 Sentinel-2 可用觀測」。
- 正式 UI 顯示觀測日期、Sentinel-2 平台、雲量、截短產品 ID，完整產品 ID 保留於 `title`。
- 建議觀測卡片標示正常：2026-07-08、Sentinel-2C、雲量 23.6%。
- 「使用此日期查詢 NDVI」成功將日期設為 2026-07-08。
- 真實 NDVI 查詢成功：平均值 0.5279、有效像素比例 100.0%、統計期間 2026-07-08T00:00:00Z 至 2026-07-09T00:00:00Z。
- 正式 UI 無 CORS 或 browser console error。
- 正式 UI 驗收成功後，頁面版本已更新為 AIAKOS V6.2；此更新將由本結案 Commit 發布。
- 本次版本正式結案。全程未記錄 Secret、Access Token 或 Authorization Header。

## 結案後修正：清除 NDVI 表單

- 修正 `clearNdviForm()`：按下「清除」時一併清空 Sentinel-2 可用觀測清單。
- 重設衛星暫時狀態、NDVI 結果、NDVI 輸入值與資料來源；後續 Hotfix 改為保留已選農地的名稱、日期與正式邊界備註。
- 將搜尋觀測與取得真實 NDVI 按鈕恢復為可操作狀態，避免非同步流程後按鈕殘留 disabled。
- 不刪除 Farm Memory 的已儲存農地或 NDVI 紀錄，也不清除目前已選取的 Polygon。
- 未影響農地管理、氣象、MQTT 或其他模組。

## Hotfix：跨 NDVI 操作保留目前農地

- 修正原因：頁面重新整理或清除後，表單文字可能仍存在，但記憶體中的 Polygon 已遺失，造成使用者看見田區名稱卻無法呼叫衛星 API。
- 目前選取農地 ID 會保存於 `aiaikosSelectedFieldId`；頁面載入及呼叫衛星 API 前都會由 Farm Memory 重新驗證並恢復 Polygon。
- `saveCurrentField()` 與 `useFieldForNdvi()` 改用同一個選取函式，避免名稱、ID、Polygon、備註與狀態訊息分流。
- 一般「清除」只清除觀測卡片、NDVI 數值、判讀結果與暫時狀態，並恢復資料來源及按鈕；不清除目前農地、Polygon、日期、備註、Farm Memory 農地或已儲存 NDVI 紀錄。
- 清除後會明確顯示已保留的農地名稱，可立即再次搜尋可用觀測或取得真實 NDVI。
- 新增獨立「取消目前農地」操作；只有此操作會清除目前選取的 ID、名稱、Polygon 及其 localStorage 選取索引，不會刪除 Farm Memory 資料。
- NDVI 判讀完成後顯示成功訊息，結果區會短暫醒目並捲動至可視範圍。
- 自動測試新增前端選取狀態、一般清除不得移除選取狀態、取消按鈕及判讀成功訊息的靜態回歸檢查。
- 本機瀏覽器驗收：選用既有 Farm Memory Polygon 後找到 6 筆真實 Sentinel-2 觀測；重新整理後未再次按「用於 NDVI」仍自動恢復相同農地並可成功搜尋。
- 清除驗收：觀測卡片由 6 筆清為 0，田區名稱、日期、Polygon 選取與 3 筆既有 Farm Memory 農地均保留；搜尋及 NDVI 按鈕恢復可操作。
- 清除後回歸：再次搜尋仍取得 6 筆觀測；真實 NDVI 平均值 0.1506、有效像素比例 100.0%、統計期間 2026-07-08T00:00:00Z 至 2026-07-09T00:00:00Z。
- 判讀回饋驗收：狀態顯示「NDVI 判讀完成」，並確認結果區具有短暫 `is-complete` 醒目狀態。
- 取消選取驗收：田區名稱與目前 Polygon 清除，但 3 筆 Farm Memory 農地仍保留；搜尋及 NDVI 兩個按鈕均提示重新選田。
- 手機版相容性：新增按鈕沿用既有可換行 `.action-row`，產品 ID 與卡片維持既有響應式規則；前端 DOM 與語法檢查未發現錯誤。
- 驗證命令：`npm test`（26/26 通過）、`npm run lint`、`npm run check`、`git diff --check` 及獨立前端 inline JavaScript 語法測試均通過。
- 本 Hotfix 不變更 Worker API、部署內容、Farm Memory 資料格式、氣象、MQTT 或其他模組；不包含任何 Secret、Access Token 或 Authorization Header。

## 接手注意事項

- 不要把 Catalog 搜尋描述成影像下載、Process API 或 NDVI 計算。
- 不要宣稱仍為 501 的端點已完成。
- 不要在 issue、PR、log、handoff 或測試輸出記錄任何 Secret 或 Access Token。
- 後續修正應維持既有 API 與正式 UI 契約，並完成相同比例的測試與 handoff 紀錄。
