# AIAKOS NDVI Image API v1.0 Handoff

## 本次目標

在 AIAKOS AI衛星農業氣象教練 V6.3 正式實作 `POST /api/v1/ndvi/image`，依使用者選定的農地 Polygon／MultiPolygon 與 Sentinel-2 觀測日期，從 CDSE Process API 取得具透明通道的 NDVI 彩色 PNG；前端提供影像資訊、圖例、下載、清除與可靠的 Leaflet bounds 覆蓋。

本輪只建立開發分支與 Draft PR，不部署正式 Cloudflare Worker、不 Merge。

## 架構

1. Hono 路由沿用 request-id、request logger、CORS、JSON body 大小限制及統一安全錯誤。
2. `ndvi-image-schema.js` 共用 Polygon／MultiPolygon、敏感欄位與雲量驗證，另限制觀測日期、PNG 格式、尺寸及總像素。
3. `process-service.js` 透過既有 `cdse-auth.js` Token Cache 呼叫 `https://sh.dataspace.copernicus.eu/process/v1`。
4. 時間固定為 `observationDate` 當日 00:00:00Z 至次日 00:00:00Z，使用 `mostRecent`，不改用其他日期。
5. 成功回應驗證 Content-Type 與 PNG signature 後直接轉送 binary，不包 JSON 或 Base64。
6. 前端以 `response.blob()`、`URL.createObjectURL()` 顯示影像；替換、清除與離頁時撤銷舊 Blob URL。
7. Leaflet Overlay 依 Process API geometry 的經緯度 bounds 定位，使用較低 pane；同一 Polygon 紅色邊界另建圖層並置於影像上方。

## evalscript 顏色規則

所有規則集中於 `src/services/satellite/ndvi-image-colors.js`：

- NDVI `< 0.20`：紅色。
- `0.20 ≤ NDVI < 0.40`：橙色。
- `0.40 ≤ NDVI < 0.60`：黃色。
- `0.60 ≤ NDVI < 0.80`：淺綠色。
- NDVI `≥ 0.80`：深綠色。
- `dataMask=0`、無效像素或分母為 0：Alpha 0，完全透明。

## 修改檔案

- 前端：`ai-agri-weather-coach/index.html`。
- Route／Schema：`src/routes/ndvi-image.js`、`src/schemas/ndvi-image-schema.js`。
- Service／顏色：`src/services/satellite/process-service.js`、`src/services/satellite/ndvi-image-colors.js`。
- 設定與中介層：`src/config/satellite.js`、`src/middleware/cors.js`、`src/index.js`。
- 測試：`tests/ndvi-image.test.js`，並回歸既有 Search、Statistics 與 validation tests。
- 文件：`docs/openapi.yaml`、`docs/API-ROADMAP.md`、`docs/SATELLITE-ARCHITECTURE.md`、`docs/CHANGELOG.md`、`docs/README.md`、`docs/NDVI-IMAGE-API.md`。
- Handoff：本文件。

## 測試結果

- `npm test`：目前 46 項測試通過，涵蓋合法 Polygon、MultiPolygon、日期、尺寸、總像素、PNG 限制、透明 evalscript、200 binary、401 refresh、403、429、5xx、timeout、非影像、安全錯誤、Blob URL、清除、選田保留及前端語法。
- 既有 Satellite Search、NDVI Statistics 與安全 validation 測試全數回歸通過。
- 真實回歸：Satellite Search 成功回傳 8 筆且建議日期為 2026-07-08；NDVI Statistics 的 `latestObservation` 非空、mean 0.5420494675636292、有效像素比例 1。
- `npm run lint`、`npm run check`、`git diff --check` 與獨立前端 JavaScript 語法檢查：通過。
- 手機版：影像卡片於 800px 以下切為單欄，五級圖例切為直向，按鈕沿用可換行 action row；無固定寬度溢出。

## 真實 Process API 驗收

- 本機 Wrangler 使用既有 `.dev.vars` 變數名稱載入 CDSE OAuth；未讀取、輸出或記錄實際值。
- `POST /api/v1/ndvi/image`：HTTP 200。
- Content-Type：`image/png`；PNG signature：`89-50-4E-47-0D-0A-1A-0A`。
- 影像尺寸：768 × 768；檔案 39,613 bytes。
- 回應標頭包含 private 300 秒快取、觀測日期 2026-07-08、測試田區 ID 與 `Sentinel-2-L2A` 資料來源。
- 實際影像呈現紅、橙、黃、淺綠、深綠五級色彩；Polygon 外角抽樣 Alpha 為 0，透明遮罩有效。

## 前端影像驗收

- 未先搜尋觀測時，可依目前 NDVI 日期取得真實 PNG；介面明確標示平台、雲量與產品 ID 未由搜尋結果提供。
- 搜尋後找到 8 筆可用觀測，選取建議日期後成功顯示 2026-07-08、Sentinel-2C、雲量 23.65% 及完整產品 ID。
- `<img>` 使用 `blob:http://127.0.0.1:8080/...`；下載與清除按鈕存在。
- 清除影像後 `src` 移除、影像卡片隱藏、Overlay 移除，已選田區與 3 筆 Farm Memory 農地保持不變。
- 一般 NDVI 清除亦移除影像與 Overlay，但重新整理後選取農地仍可由 localStorage 恢復。
- 取消目前農地會同時清除影像與選取狀態，不刪除 Farm Memory。
- 本機同源允許的前端至 Worker 請求成功，未出現 CORS 或可見 JavaScript 錯誤。

## 地圖覆蓋驗收

- PNG 依 Polygon bounds 成功加入 Leaflet；地圖 DOM 存在一個 image layer 及紅色 Polygon boundary。
- 顯示／隱藏切換正常；隱藏後 image layer 為 0，再顯示恢復為 1。
- 透明度滑桿設為 0.4 後 image layer 實際 style opacity 為 0.4。
- Polygon 外部區域由 Process API `dataMask` 透明處理；紅色邊界使用較高圖層並 `bringToFront()`。

## 已知限制

- 第一版尺寸固定由前端請求 768 × 768；API 雖支援合法範圍，UI 尚未提供尺寸選擇器。
- 無搜尋結果時能以日期查詢影像，但無法顯示單一平台、雲量或產品 ID，介面會明確標示未提供。
- 服務能辨識上游 204／404、非 PNG 或無效 PNG；若上游回傳結構有效但所有像素皆透明，第一版不另解析整張 PNG 計算有效像素比例。
- Leaflet 使用 geometry 的 axis-aligned bounds；真正 Polygon 外部像素透明由 Process API geometry 與 dataMask 保證。
- 正式 Worker 與 GitHub Pages 尚未部署本分支版本。

## 安全檢查

- Client 傳入 OAuth／Token 欄位會被拒絕。
- PNG route 不回傳 Token、Client ID、Client Secret、Authorization Header、上游完整錯誤或 stack trace。
- 只記錄 request-id、安全錯誤代碼、方法、路徑、狀態與耗時；不記錄 request body 或憑證。
- Content-Type、PNG signature、尺寸、總像素及格式均有防護。
- 本文件與所有測試證據未包含任何 Secret、Access Token 或 Authorization Header 值。

## Branch、Commit、PR

- Branch：`feature/ndvi-image-api-v1`。
- 起點 main Commit：`678757c16db2772fa76c421963ffc48268c3f2f2`（PR #3 Merge Commit）。
- Commit：`feat: add AIAKOS NDVI Image API v1.0`（SHA 以本次 Git commit 結果為準）。
- Draft PR：#4，base `main`，等待 ChatGPT 第一輪 Review；不可部署、不可 Merge。

## 下一步：NDVI History API

定義可稽核的 NDVI 時間序列來源、持久化模式、資料保留政策、查詢範圍、農地權限與快取策略，再實作 `GET /api/v1/ndvi/history`。

## 接手注意事項

- 不得將 Esri 參考底圖描述為 NDVI 資料來源。
- 不得改用與 `observationDate` 不同的影像日期。
- 不得把 PNG 轉為 Base64 JSON。
- 替換或清除影像時必須撤銷舊 Blob URL 並移除 Overlay。
- 不得在程式碼、PR、Handoff、log 或測試輸出記錄任何 Secret 或 Token。
