# API Roadmap

## v1.0 已完成

- `GET /api/v1/health`
- `GET /api/v1/cdse/status`
- `POST /api/v1/ndvi/statistics`
- `POST /api/v1/satellite/search`：CDSE Catalog/STAC Sentinel-2 L2A 觀測搜尋。
- `POST /api/v1/ndvi/image`：CDSE Process API Sentinel-2 L2A NDVI 彩色 PNG。

## 預留端點（HTTP 501）

- `GET /api/v1/ndvi/history`：持久化時間序列。
- `POST /api/v1/ai/analyze`：結合 NDVI、氣象與農場記憶的 AI 判讀。

預留端點不回傳假資料，正式開發時需另訂驗收、權限、配額與儲存策略。

## 下一階段

- NDVI History API：定義時間序列來源、持久化、查詢範圍與資料保留政策。
