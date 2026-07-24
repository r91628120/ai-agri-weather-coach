# Farm Memory NDVI Session v1

## 目的

Farm Memory NDVI Session v1 定義可長期保存的 NDVI 觀測資料模型，以及獨立的瀏覽器 `localStorage` Repository。本階段只提供資料層，不包含主要 UI、Session Save UI 或 Session Restore。

## Schema

固定 `schemaVersion` 為 `"1.0"`。每筆 Session 包含：

- `sessionId`
- `field`：`id`、`name`、`crop`、`variety`、Polygon／MultiPolygon `geometry`
- `observation`：`date`、`platform`、`cloudCoverage`、`productId`、`processingLevel`
- `statistics`：`mean`、`min`、`max`、`stDev`、`validPixelRatio`、`sampleCount`、`noDataCount`
- `interpretation`：`status`、`patrolPriority`、`risk`、`recommendation`
- `image`：`source`、`width`、`height`、`canRegenerate`
- `createdAt`、`updatedAt`

影像只保存可重新產生所需的中繼資料，不保存 Blob URL 或 Base64 PNG。

## Storage key

新資料使用獨立 key：

```text
aiaikosFarmMemoryNdviSessionsV1
```

既有農地、NDVI records 與 selected field keys 不會被改名、覆寫或清除。

## Repository API

- `createNdviSession(input)`
- `validateNdviSession(session)`
- `saveNdviSession(session)`
- `getNdviSessions()`
- `getNdviSessionById(sessionId)`
- `deleteNdviSession(sessionId)`
- `clearAllNdviSessions()`
- `generateNdviSessionId(fieldId, observationDate)`
- `migrateNdviSessions(rawData)`

模組透過 `window.AIAKOSFarmMemoryNdviSessions` 提供 API。所有輸入、保存結果與讀取結果均採深拷貝。

## 驗證規則

- `geometry` 僅接受 Polygon 或 MultiPolygon。
- `observation.date` 必須是有效的 `YYYY-MM-DD`。
- NDVI `mean`、`min`、`max` 必須介於 -1 到 1。
- 比例、像素數、影像尺寸與 ISO 8601 時間必須有效。
- `sessionId` 及 `fieldId + productId` 不重複新增；再次保存時更新既有 Session。
- 損壞 JSON 回傳空陣列；單筆損壞資料會被略過。
- 禁止保存 Blob URL、Base64 圖片、Secret、Token 或 Authorization 資料。

## 已知限制

- 尚未整合主要 UI。
- 尚未提供「儲存本次觀測」操作。
- 尚未實作 Session Restore。
- v1 使用瀏覽器 localStorage，沒有跨裝置同步或伺服器備份。

## 下一階段

下一階段為 Session Save UI，將在獨立 PR 中串接本 Repository；本階段不提前實作。
