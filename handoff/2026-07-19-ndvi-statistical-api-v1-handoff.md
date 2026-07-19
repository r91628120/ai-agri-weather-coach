# AIAKOS NDVI Statistical API v1.0 Handoff

## 本次目標

在既有 `ai-agri-weather-coach/workers/satellite-api` Cloudflare Worker 中，以相容既有 OAuth、Token Cache、CORS、Request ID 與統一回應格式的方式，建立可維護、可測試的 Sentinel-2 L2A NDVI Statistical API，並以最小變更串接現有農地 Polygon 前端。

## 已完成功能

- `POST /api/v1/ndvi/statistics` 路由與統一成功／錯誤回應。
- Polygon／MultiPolygon、經緯度、閉合環、日期、366 天期間與雲量驗證。
- 禁止前端傳入 OAuth Token、Client ID、Client Secret 與 Authorization Header。
- 沿用既有 CDSE OAuth2 Client Credentials 與 Token Cache。
- Sentinel-2 L2A B04／B08 NDVI、`dataMask`、`leastCC` 與 10 公尺解析度。
- 10 秒逾時、401 Token refresh、429／5xx 有限重試與安全錯誤映射。
- 多區間 observations 正規化及最新有效 `latestObservation` 選取。
- 結構化 request/error logger，不記錄敏感資料。
- 前端真實 NDVI 按鈕及 Loading、Success、Empty、Error 狀態。
- 前端顯示平均值、最小值、最大值、標準差、有效像素比例及統計期間。
- 繁體中文文件、OpenAPI 與 Node.js 內建測試。

## 修改檔案

- `ai-agri-weather-coach/index.html`
- `ai-agri-weather-coach/workers/satellite-api/src/config/satellite.js`
- `ai-agri-weather-coach/workers/satellite-api/src/middleware/`
- `ai-agri-weather-coach/workers/satellite-api/src/routes/`
- `ai-agri-weather-coach/workers/satellite-api/src/schemas/`
- `ai-agri-weather-coach/workers/satellite-api/src/services/satellite/`
- `ai-agri-weather-coach/workers/satellite-api/src/utils/`
- `ai-agri-weather-coach/workers/satellite-api/tests/`
- `ai-agri-weather-coach/workers/satellite-api/docs/`
- `handoff/README.md`
- `handoff/2026-07-19-ndvi-statistical-api-v1-handoff.md`

## 測試結果

- `GET /api/v1/cdse/status`：本機 HTTP 200，`configured` 與 `connected` 均為 `true`。
- `POST /api/v1/ndvi/statistics`：以嘉義縣大林鎮真實地理位置 Polygon 呼叫本機 Worker，HTTP 200。
- API 回應：`latestObservation` 不為 `null`，NDVI mean 為 `0.52954131364822388`（介於 -1 與 1），`validPixelRatio` 為 `1`，共 15 筆 observation。
- API 最新統計期間：`2026-07-18T00:00:00Z` 至 `2026-07-19T00:00:00Z`。
- 瀏覽器端到端：從前端匯入同一 Polygon、選為 NDVI 農地並呼叫本機 Worker成功；頁面顯示平均值 `0.5279`、有效像素比例 `100.0%`，以及最小值、最大值、標準差與統計期間。
- `npm test`：17/17 通過。
- npm audit：0 vulnerabilities。
- `npm run lint`：通過。
- `npm run check`：Wrangler deploy dry-run 通過。
- `git diff --check`：通過。
- 前端 inline JavaScript 語法：4 個 script block 全數通過。
- 錯誤 Polygon：HTTP 400 `VALIDATION_ERROR`。
- 四個預留端點：HTTP 501 `NOT_IMPLEMENTED`。
- 測試過程僅記錄狀態碼與非敏感統計，未輸出或保存 Client ID、Client Secret、Access Token 或 Authorization Header。
- 安全檢查：`.dev.vars`、`node_modules`、`.wrangler` 均受 Git ignore 保護，且沒有上述路徑被追蹤；敏感字串掃描僅命中範例 placeholder 與測試用假資料，未發現真實憑證。

## 尚未完成項目

- `POST /api/v1/ndvi/image`：501。
- `GET /api/v1/satellite/search`：501。
- `GET /api/v1/ndvi/history`：501。
- `POST /api/v1/ai/analyze`：501。
- NDVI 影像分布與歷史趨勢屬後續版本。
- 正式 Worker 目前仍提供舊版 6 天前的部署內容，尚未承載此分支的 NDVI Statistical API；須在第二輪審查通過後部署／提升目前版本，不得把本機成功誤記為正式環境已通過。

## 已知限制

- 查詢期間最多 366 天，JSON request body 上限 64 KiB。
- 目前採每日聚合、10 公尺解析度與 `leastCC` mosaicking。
- `maxCloudCoverage` 是影像層級過濾，不保證農地範圍完全無雲。
- `validPixelRatio` 代表有效統計像素比例，不等於作物覆蓋率。
- 前端正式 API URL 必須指向已部署且允許 GitHub Pages origin 的 Cloudflare Worker。

## 部署與環境設定

- Worker 名稱：`aiaikos-satellite-api`。
- 本機環境檔：`.dev.vars`，已由 Git 忽略。
- Cloudflare Secrets 名稱：`CDSE_CLIENT_ID`、`CDSE_CLIENT_SECRET`。
- 不得將 Secret、Access Token 或 Authorization Header 寫入 Git、Handoff、前端、log 或 API 回應。
- 正式 Worker URL：`https://aiaikos-satellite-api.r91628120.workers.dev`。
- Cloudflare Dashboard 顯示目前正式流量仍指向舊版「AIAKOS API v1 - Health Endpoint」部署；此工作階段未執行部署、Promote 或 Merge。
- 部署前指令：`npx.cmd wrangler secret put CDSE_CLIENT_ID`、`npx.cmd wrangler secret put CDSE_CLIENT_SECRET`、`npm.cmd run deploy`。

## Branch 與 PR

- Branch：`feature/ndvi-statistical-api-v1`
- PR：#1 — `feat: AIAKOS NDVI Statistical API v1.0`
- PR 狀態：Draft；不得 Merge，等待第二輪程式碼審查。

## 下一步

1. 完成安全掃描、最終測試、commit 與 push。
2. 等待 ChatGPT 第二輪 Review，不合併 PR。
3. 第二輪審查通過後，才部署／Promote 本分支 Worker 並重新執行正式 URL 驗收。
4. 正式部署後，以 GitHub Pages 再確認跨來源呼叫及真實 NDVI 顯示。

## 接手注意事項

- 不得另建第二套 OAuth；必須沿用 `src/services/cdse-auth.js`。
- 不得把四個 501 端點描述為已完成。
- 不得在報告或除錯輸出顯示 Secret 或 Access Token。
- 不得將 `.dev.vars`、`node_modules` 或 `.wrangler` 納入 Git。
- 不得因本次 API 修正破壞手動 NDVI、教學模擬、農地管理、氣象三站融合、MQTT 或 Farm Memory。
- `og-image01.png` 與本次 NDVI API 無關，已從 PR 移除，應在後續 SEO commit 個別處理。
