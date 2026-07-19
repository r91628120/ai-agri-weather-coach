# 衛星服務架構

## 請求流程

1. `request-id` 建立或沿用 `X-Request-ID`。
2. `request-logger` 僅記錄方法、路徑、狀態與耗時。
3. CORS 沿用既有允許來源。
4. 路由檢查 Content-Type、64 KiB 大小限制與 JSON 格式。
5. schema 驗證 Polygon/MultiPolygon、日期、雲量與禁傳憑證欄位。
6. `statistical-service` 透過既有 `cdse-auth` 取得快取 Token。
7. 呼叫 CDSE Statistical API，逾時 10 秒；401 只允許一次 Token 更新，429/5xx 有限重試。
8. 將多區間統計正規化，依 `intervalTo` 選出最新有效觀測。

## 模組責任

- `config/`：應用與衛星常數。
- `middleware/`：CORS、Request ID、結構化 request log 與安全錯誤處理。
- `routes/`：HTTP 驗證、狀態碼與統一回應。
- `schemas/`：不接觸網路的輸入驗證。
- `services/cdse-auth.js`：唯一 OAuth2 與 Token Cache 來源。
- `services/satellite/`：Statistical API 實作與未來 Process/Catalog/History 邊界。
- `utils/response.js`：既有統一 JSON 格式，不另建第二套格式。

## 安全邊界

`catalog-service` 與 Statistical API 共用既有 OAuth token provider 與 Polygon/MultiPolygon 驗證。Catalog 搜尋只回傳 STAC 中繼資料，不下載影像，也不計算 NDVI。

瀏覽器只傳農地、日期與雲量。Cloudflare Worker 從 Secrets 讀取 CDSE 憑證。任何 log 均不得包含請求 body、完整 env、Authorization Header、Secret 或 Access Token。
