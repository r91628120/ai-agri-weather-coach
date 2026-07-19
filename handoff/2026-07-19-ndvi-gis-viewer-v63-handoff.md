# AIAKOS V6.3 NDVI GIS Viewer Hotfix Handoff

## UAT 發現

PR #4 的 NDVI Image API 與透明 PNG 已通過正式驗收，但前端預設將純 NDVI 圖放在棋盤格背景中，缺少地理位置、地形與農地邊界的直觀參考；原有「地圖覆蓋」也使用農地管理地圖，沒有獨立的影像分析 Viewer。

## 問題原因

- NDVI Image 卡片以 `<img>` 純圖預覽為主要視覺。
- Leaflet ImageOverlay 綁定 `fieldBoundaryMap`，沒有獨立 Viewer 生命週期。
- NDVI 與 Polygon 共用一個切換狀態，無法獨立控制。
- 原 opacity 預設為 0.75，且「地圖覆蓋」控制在窄欄中容易垂直拆字。

## GIS 圖層架構

由下而上：

1. Esri World Imagery tile layer，僅供位置與地形參考。
2. Copernicus Sentinel-2 L2A NDVI PNG `L.imageOverlay`，pane z-index 350，預設 opacity 0.55。
3. 使用者儲存的農地 Polygon 紅色邊界，pane z-index 450、weight 5、fillOpacity 0。

`initializeNdviGisViewer()` 確保整頁只建立一個 Leaflet map。底圖、NDVI、Polygon、透明度及 GIS／純圖模式切換只操作現有前端 layer，不呼叫 API。下載功能仍使用原始 NDVI Blob URL，不合成 Esri 底圖。

## 修改檔案

- `ai-agri-weather-coach/index.html`：獨立 GIS Viewer、三層控制、模式切換、單例地圖、清除／取消狀態與響應式版面。
- `ai-agri-weather-coach/workers/satellite-api/tests/ndvi-image.test.js`：新增 GIS Viewer 預設值、圖層切換、透明度、fitBounds、模式、清除語意、單例地圖與 API 回歸測試。
- `ai-agri-weather-coach/workers/satellite-api/docs/CHANGELOG.md`：記錄 V6.3 GIS Viewer Hotfix。
- `ai-agri-weather-coach/workers/satellite-api/docs/NDVI-IMAGE-API.md`：補充前端 GIS 顯示模式，不變更 API 契約。
- `handoff/2026-07-19-ndvi-gis-viewer-v63-handoff.md`：本文件。

## 測試結果

- `npm test`：55/55 通過，Search、Statistics、Image API 回歸均通過。
- `npm run lint`：通過。
- `npm run check`：Wrangler dry-run 通過，沒有部署。
- 獨立前端 JavaScript syntax test：1/1 通過。
- `git diff --check`：通過。
- 新增測試確認圖層切換及 opacity 函式不含 `fetch()`，不會重新呼叫 API 或重新下載 PNG。

## 手動驗收結果

- DOM、CSS 與 JavaScript 靜態驗收：GIS Viewer 容器、Desktop 520px、Mobile 360px、控制項換行、五級圖例、四段資料來源說明均符合規格。
- 瀏覽器可視化驗收未完成：Codex 瀏覽器安全政策禁止開啟本機 `file://` 頁面，本輪又明確禁止部署，因此未以其他瀏覽器或正式網站繞過限制。
- 不宣稱已完成真實瀏覽器點擊或 Esri 圖磚視覺驗收；Draft PR Review 時應由允許 localhost 的環境補做桌面與手機 UAT。

## 已知限制

- Esri World Imagery 需要瀏覽器可連線至 ArcGIS tile service。
- ImageOverlay 仍使用 geometry 的 axis-aligned bounds；Polygon 外部透明度由 Process API geometry 與 dataMask 保證。
- 本輪沒有部署 GitHub Pages 或 Cloudflare Worker，因此正式網站仍顯示 main 既有版本，直到 Hotfix Review 與後續合併／部署流程完成。

## Branch、Commit、PR

- Branch：`hotfix/ndvi-gis-viewer-v63`。
- Commit：`fix: add NDVI GIS viewer with satellite basemap`。
- Draft PR：#5，base `main`；維持 Draft，不 Merge。

## 範圍確認

- 未修改 Worker Public API、route、schema、service 或 OpenAPI endpoint。
- 未重新部署 Cloudflare Worker。
- 未開始 Satellite Observation Center。
- 未刪除或變更 Farm Memory、selected field localStorage 或已儲存 NDVI 紀錄。
