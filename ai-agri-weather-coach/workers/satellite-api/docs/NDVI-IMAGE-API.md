# AIAKOS NDVI Image API v1.0

## Endpoint

`POST /api/v1/ndvi/image`

使用 CDSE Sentinel Hub Process API，依指定農地 Polygon 或 MultiPolygon 與單一 `observationDate` 產生 Sentinel-2 L2A NDVI 彩色 PNG。回應是 PNG binary，不是 JSON 或 Base64。

## Request

```json
{
  "fieldId": "FIELD-12345678",
  "fieldName": "示範農地",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[120.48, 23.60], [120.481, 23.60], [120.481, 23.601], [120.48, 23.60]]]
  },
  "observationDate": "2026-07-08",
  "width": 768,
  "height": 768,
  "format": "image/png",
  "maxCloudCoverage": 30
}
```

- `observationDate` 必填，格式 `YYYY-MM-DD`。
- `width`、`height` 預設 768，範圍 256–1536。
- 總像素上限 1,572,864。
- `format` 第一版只接受 `image/png`。
- 不接受 Client ID、Client Secret、Token 或 Authorization 欄位。

## Date and data selection

Process API `timeRange` 固定為觀測日 00:00:00Z 至次日 00:00:00Z，`mosaickingOrder` 為 `mostRecent`。服務不會偷偷改用其他日期；若上游明確表示當日沒有影像，回傳安全的 `CDSE_NO_IMAGE` 錯誤。

## NDVI and colors

`NDVI = (B08 - B04) / (B08 + B04)`。

| NDVI | 顏色 |
|---|---|
| `< 0.20` | 紅色 |
| `0.20–0.39` | 橙色 |
| `0.40–0.59` | 黃色 |
| `0.60–0.79` | 淺綠色 |
| `≥ 0.80` | 深綠色 |
| 無效像素或 `dataMask=0` | 透明 |

顏色與 evalscript 集中於 `src/services/satellite/ndvi-image-colors.js`。

## Success response

- HTTP 200
- `Content-Type: image/png`
- `Cache-Control: private, max-age=300`
- `X-AIAKOS-Observation-Date`
- `X-AIAKOS-Field-Id`
- `X-AIAKOS-Data-Source: Sentinel-2-L2A`

## Safe errors

驗證與上游錯誤使用 AIAKOS 統一 JSON 錯誤格式。服務不回傳 OAuth Token、Client ID、Client Secret、Authorization Header、上游完整錯誤或 stack trace。

可能代碼包括 `VALIDATION_ERROR`、`CDSE_NO_IMAGE`、`CDSE_UNAUTHORIZED`、`CDSE_FORBIDDEN`、`CDSE_RATE_LIMITED`、`CDSE_UNAVAILABLE`、`CDSE_TIMEOUT` 與 `CDSE_INVALID_IMAGE_RESPONSE`。
