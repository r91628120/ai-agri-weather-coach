# AIAKOS NDVI Statistical API v1.0

## Endpoint

`POST /api/v1/ndvi/statistics`，Content-Type 必須為 `application/json`。

## Request

```json
{
  "fieldId": "FIELD-001",
  "fieldName": "頂員林黑豆田",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[120.47, 23.59], [120.48, 23.59], [120.48, 23.60], [120.47, 23.59]]]
  },
  "dateFrom": "2026-07-01",
  "dateTo": "2026-07-18",
  "maxCloudCoverage": 30
}
```

`maxCloudCoverage` 省略時為 30。日期範圍最多 366 天。不得傳入 Token、Client ID、Client Secret 或 Authorization。

## Response

成功為既有 AIAKOS 統一格式：

```json
{
  "success": true,
  "requestId": "...",
  "timestamp": "...",
  "data": {
    "provider": "Copernicus Data Space Ecosystem",
    "collection": "Sentinel-2 L2A",
    "resolutionMeters": 10,
    "requestedRange": { "from": "2026-07-01", "to": "2026-07-18" },
    "latestObservation": {
      "intervalFrom": "...",
      "intervalTo": "...",
      "ndvi": { "mean": 0.63, "min": 0.22, "max": 0.84, "stDev": 0.11 },
      "sampleCount": 1000,
      "noDataCount": 90,
      "validPixelRatio": 0.91
    },
    "observations": []
  }
}
```

沒有有效像素時 `latestObservation` 為 `null`，`observations` 仍保留 CDSE 回傳的可解析區間。

## Validation

- `geometry.type` 僅接受 `Polygon` 或 `MultiPolygon`。
- 每個環至少四個座標，首尾必須閉合；經度為 -180 至 180，緯度為 -90 至 90。
- 日期必須為有效的 `YYYY-MM-DD`，且 `dateFrom` 不得晚於 `dateTo`。
- `maxCloudCoverage` 為 0 至 100。
- JSON 上限 64 KiB。

## Error codes

- `VALIDATION_ERROR`：HTTP 400。
- `CLIENT_AUTH_NOT_ALLOWED`：HTTP 400；瀏覽器不得傳入 Authorization Header。
- `INVALID_JSON`：HTTP 400。
- `REQUEST_BODY_TOO_LARGE`：HTTP 413。
- `UNSUPPORTED_MEDIA_TYPE`：HTTP 415。
- `CDSE_UNAUTHORIZED`、`CDSE_FORBIDDEN`、`CDSE_REQUEST_REJECTED`：HTTP 502。
- `CDSE_RATE_LIMITED`、`CDSE_UNAVAILABLE`：HTTP 503。
- `CDSE_TIMEOUT`：HTTP 504。

## NDVI 與有效像素

NDVI 由 Sentinel-2 L2A 的近紅外光 B08 與紅光 B04 計算：`(B08 - B04) / (B08 + B04)`。`dataMask` 排除來源無資料及分母為零的像素。`validPixelRatio = (sampleCount - noDataCount) / sampleCount`；它反映統計矩陣的有效像素比例，不等同於作物覆蓋率。

## 使用限制

採 10 公尺解析度、每日聚合與 `leastCC` mosaicking。`maxCloudCoverage` 是影像層級篩選，並不保證農地範圍完全無雲。大量或高頻查詢仍受 CDSE 配額與 Processing Unit 限制。
