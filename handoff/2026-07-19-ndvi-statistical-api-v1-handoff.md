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

- 正式 `GET /api/v1/health`：HTTP 200，`status=online`。
- 正式 `GET /api/v1/cdse/status`：HTTP 200，`configured=true`、`connected=true`。
- 正式 `POST /api/v1/ndvi/statistics`：以嘉義縣大林鎮 Polygon 呼叫，HTTP 200，`latestObservation` 不為 `null`。
- 正式 NDVI 統計：mean `0.5295413136482239`、min `0.5295413136482239`、max `0.5295413136482239`、stDev `0`、`validPixelRatio=1`，統計期間為 `2026-07-18T00:00:00Z` 至 `2026-07-19T00:00:00Z`。
- 正式 CORS 預檢：以 `https://r91628120.github.io` 為 Origin 呼叫 NDVI 端點，HTTP 204，`Access-Control-Allow-Origin` 正確回傳該 Origin。
- GitHub Pages 正式站驗收：根網址會自動導向 `/ai-agri-weather-coach/` 應用；可看到「取得真實衛星 NDVI」按鈕、匯入並選用農地 Polygon，且可成功取得真實結果。
- 正式 UI 結果：平均 NDVI `0.5279`、有效像素比例 `100.0%`、統計期間 `2026-07-08T00:00:00Z` 至 `2026-07-09T00:00:00Z`，瀏覽器未出現 CORS 或 console error。
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
- 正式程式部署時間：`2026-07-19T02:21:03.771Z`（臺北時間 `2026-07-19 10:21:03`）。
- 程式部署 Version ID：`2c61e7a0-10c8-4bd9-bcb9-302a8581d9ad`，部署來源為 Git Commit `defd8df55ab3057b2b3177374302166e19d7baaf`。
- 遠端 Secret 更新後目前 100% 流量 Version ID：`6544538e-56a2-426d-ba9d-dc8dab508bee`，建立時間 `2026-07-19T02:50:22.229Z`。
- 正式 Worker 已通過 health、CDSE OAuth 與真實 NDVI Polygon 驗收；全程僅確認 Secret 名稱存在，未讀取、輸出或記錄值與 Access Token。
- GitHub Pages 設定：legacy build，來源為 `main` 分支根目錄 `/`。
- PR #1 Squash merge Commit：`bc5d4e384380d42d4bcabcbdae54da95422f313f`，合併時間 `2026-07-19T03:00:27Z`。
- GitHub Pages 根網址轉址 Commit：`3fd5071e895a88a73554bc0567c8a4dde222f4f7`；Pages build 於 `2026-07-19T03:04:03Z` 完成。
- 正式網站：`https://r91628120.github.io/ai-agri-weather-coach/`，會導向已驗收的應用子路徑。
- 部署前指令：`npx.cmd wrangler secret put CDSE_CLIENT_ID`、`npx.cmd wrangler secret put CDSE_CLIENT_SECRET`、`npm.cmd run deploy`。

## Branch 與 PR

- 結案 Branch：`main`
- 開發 Branch：`feature/ndvi-statistical-api-v1`
- PR：#1 — `feat: AIAKOS NDVI Statistical API v1.0`
- PR 狀態：已由 Draft 轉為 Ready，並於 `2026-07-19T03:00:27Z` Squash merge 至 `main`。

## 下一步

1. 本版進入維護狀態；後續功能應另開分支與 PR。
2. 依產品優先序另行實作四個目前回傳 501 的預留端點。
3. 持續監控 Cloudflare Worker 與 CDSE 服務狀態，不得在監控、文件或日誌記錄 Secret 或 Access Token。

## 接手注意事項

- 不得另建第二套 OAuth；必須沿用 `src/services/cdse-auth.js`。
- 不得把四個 501 端點描述為已完成。
- 不得在報告或除錯輸出顯示 Secret 或 Access Token。
- 不得將 `.dev.vars`、`node_modules` 或 `.wrangler` 納入 Git。
- 不得因本次 API 修正破壞手動 NDVI、教學模擬、農地管理、氣象三站融合、MQTT 或 Farm Memory。
- `og-image01.png` 與本次 NDVI API 無關，已從 PR 移除，應在後續 SEO commit 個別處理。
