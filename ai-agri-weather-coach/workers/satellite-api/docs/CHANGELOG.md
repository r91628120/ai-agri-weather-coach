# Changelog

## Satellite Search API v1.0 - 2026-07-19

- 新增 `POST /api/v1/satellite/search`，查詢真實 CDSE Sentinel-2 L2A Catalog/STAC 中繼資料。
- 共用 Polygon/MultiPolygon、日期、雲量與敏感欄位驗證，新增 limit 1–50 驗證。
- 回傳依時間新到舊排序的觀測清單；同時間優先較低雲量，並標示建議觀測。
- 前端新增搜尋狀態、觀測卡片及「使用此日期查詢 NDVI」。
- NDVI 影像與歷史端點仍維持 HTTP 501。

## 1.0.0 - 2026-07-19

- 建立 AIAKOS Satellite Service Enterprise v1.0 模組邊界。
- 新增 Sentinel-2 L2A NDVI Statistical API、輸入驗證、逾時與有限重試。
- 新增安全結構化 logger 與全域錯誤處理。
- 新增四個 HTTP 501 預留端點。
- 新增 Node.js 內建測試、fixtures、繁體中文文件與 OpenAPI 3.1 規格。
