# 衛星服務架構

## 請求流程

1. `request-id` 建立或沿用 `X-Request-ID`。
2. `request-logger` 僅記錄方法、路徑、狀態與耗時。
3. CORS 沿用既有允許來源。
4. 路由檢查 Content-Type、64 KiB 大小限制與 JSON 格式。
5. schema 驗證 Polygon/MultiPolygon、日期、雲量與禁傳憑證欄位。
6. Statistical、Catalog 與 Process service 都透過既有 `cdse-auth` 取得快取 Token。
7. Process API 嚴格使用 `observationDate` 當日 00:00:00Z 至次日 00:00:00Z，不自動改用其他日期。
8. `ndvi-image-colors.js` 集中管理五級 NDVI 顏色與透明 dataMask evalscript。
9. Process API 成功時直接轉送已驗證 PNG binary；不使用 JSON 或 Base64 包裝。
10. 上游逾時 10 秒；401 觸發一次 Token 更新，429/5xx 有限重試。

## 模組責任

- `config/`：應用與衛星常數。
- `middleware/`：CORS、Request ID、結構化 request log 與安全錯誤處理。
- `routes/`：HTTP 驗證、狀態碼與統一回應。
- `schemas/`：不接觸網路的輸入驗證。
- `services/cdse-auth.js`：唯一 OAuth2 與 Token Cache 來源。
- `services/satellite/`：Statistical、Catalog、Process API 實作與 History 邊界。
- `utils/response.js`：既有統一 JSON 格式，不另建第二套格式。

## 安全邊界

`catalog-service`、Statistical API 與 Process API 共用既有 OAuth token provider 與 Polygon/MultiPolygon 驗證。Catalog 搜尋只回傳 STAC 中繼資料；Process API 只回傳已驗證為 PNG 的二進位影像。

Process API 限制尺寸 256–1536，預設 768 × 768，且總像素不得超過 1,572,864。只接受 `image/png`。PNG 以 `private, max-age=300` 快取，並回傳安全的觀測日期、田區 ID 與資料來源標頭。

瀏覽器只傳農地、日期與雲量。Cloudflare Worker 從 Secrets 讀取 CDSE 憑證。任何 log 均不得包含請求 body、完整 env、Authorization Header、Secret 或 Access Token。
