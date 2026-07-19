# API Roadmap

## v1.0 已完成

- `GET /api/v1/health`
- `GET /api/v1/cdse/status`
- `POST /api/v1/ndvi/statistics`

## 預留端點（HTTP 501）

- `POST /api/v1/ndvi/image`：Sentinel Hub Process API NDVI/RGB 影像。
- `GET /api/v1/satellite/search`：Catalog API 影像搜尋。
- `GET /api/v1/ndvi/history`：持久化時間序列。
- `POST /api/v1/ai/analyze`：結合 NDVI、氣象與農場記憶的 AI 判讀。

預留端點不回傳假資料，正式開發時需另訂驗收、權限、配額與儲存策略。
