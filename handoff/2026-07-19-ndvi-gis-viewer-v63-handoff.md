# AIAKOS V6.3 NDVI GIS Viewer Hotfix Handoff

## UAT 發現

PR #4 的 NDVI Image API 與透明 PNG 已通過正式驗收，但前端預設將純 NDVI 圖放在棋盤格背景中，缺少地理位置、地形與農地邊界的直觀參考；原有「地圖覆蓋」也使用農地管理地圖，沒有獨立的影像分析 Viewer。

第一輪 localhost UAT 的 GIS 疊圖、圖層、透明度、模式與 API 操作均成功，唯一失敗是窄版工具列文字會拆成二至三行。此輪針對該唯一 UAT finding 精簡重複控制並收斂行動版 CSS。

## 問題原因

- NDVI Image 卡片以 `<img>` 純圖預覽為主要視覺。
- Leaflet ImageOverlay 綁定 `fieldBoundaryMap`，沒有獨立 Viewer 生命週期。
- NDVI 與 Polygon 原先共用一個切換狀態，無法獨立控制。
- Hotfix 第一版的三個自訂 layer checkbox 與後續 Leaflet Layers Control 功能重複；label 在窄版允許一般換行，造成中文控制文字拆成二至三行。
- 原 opacity 預設為 0.75；GIS Viewer 已統一為 0.55。

## GIS 圖層架構

由下而上：

1. Leaflet base layer：預設 Esri World Imagery，並可切換 Esri World Street Map，僅供位置與地形參考。
2. Copernicus Sentinel-2 L2A NDVI PNG `L.imageOverlay`，pane z-index 350，預設 opacity 0.55。
3. 使用者儲存的農地 Polygon 紅色邊界，pane z-index 450、weight 5、fillOpacity 0。

`initializeNdviGisViewer()` 確保整頁只建立一個 Leaflet map 與一個 `L.control.layers`。底圖為互斥 base layers；NDVI 與 Polygon 為可獨立切換 overlays。重新取得影像會先從 map 與 Layers Control 移除舊 layer reference，再註冊新 overlay；一般清除只移除 NDVI，取消農地才同時移除 Polygon。

GIS 模式使用左下角單例 Leaflet Control 顯示五級 NDVI 浮動圖例，右上角 Layers Control 不遮擋 zoom 與 attribution。NDVI overlay 被隱藏／清除或切換純圖模式時，浮動圖例同步隱藏；純圖模式使用同一 Blob URL 並保留圖片下方的原始五級圖例，不重新呼叫 API。Polygon pane 永遠高於 NDVI pane，base layer 切換後亦重新 bring-to-front。

自訂工具列只保留模式、opacity 與 fitBounds，避免與 Layers Control 重複。行動版以單欄 grid 配合 `min-width:0`、`white-space:nowrap`、`word-break:keep-all` 與 `overflow-wrap:normal`，確保 390px 與 360px 不逐字拆行。透明度調整只呼叫 `setOpacity()`，並顯示即時百分比；下載功能仍使用原始 NDVI Blob URL，不合成 Esri 底圖。

## 修改檔案

- `ai-agri-weather-coach/index.html`：響應式工具列、單例 Layers Control、雙 Esri 底圖、動態 overlay 管理、五級浮動圖例、模式與清除狀態。
- `ai-agri-weather-coach/workers/satellite-api/tests/ndvi-image.test.js`：擴充 Layers Control 單例／預設值、stale reference、圖例生命週期、390px／360px 排版、opacity 與 API 回歸測試。
- `ai-agri-weather-coach/workers/satellite-api/docs/CHANGELOG.md`：記錄 V6.3 GIS Viewer Hotfix。
- `ai-agri-weather-coach/workers/satellite-api/docs/NDVI-IMAGE-API.md`：補充前端 GIS 顯示模式，不變更 API 契約。
- `handoff/2026-07-19-ndvi-gis-viewer-v63-handoff.md`：本文件。

## 測試結果

- `npm test`：59/59 通過，Search、Statistics、Image API 回歸均通過。
- `npm run lint`：通過。
- `npm run check`：Wrangler dry-run 通過，沒有部署。
- 獨立前端 JavaScript syntax test：4 個 inline scripts 全部通過（同時已有 Node test 覆蓋）。
- `git diff --check`：通過；Commit 後再以 `origin/main...HEAD` 驗證完整 PR diff。
- 測試確認圖層／模式／opacity 程式區段不含 `fetch()`，不會重新呼叫 API 或重新下載 PNG。

## 手動驗收結果

- 本機 HTTP Server：`http://localhost:8080/ai-agri-weather-coach/`，HTTP 200；本機 Worker health：HTTP 200。
- DOM、CSS 與 JavaScript 靜態驗收：Desktop 520px、Mobile 360px、單欄工具列、nowrap 中文標籤、單例 Layers Control、五級浮動圖例、純圖原圖例與四段資料來源說明均符合規格。
- Desktop、390×844、360×800 的本輪瀏覽器可視化 UAT：Blocked。Codex 內建瀏覽器在接管 localhost 分頁後由 URL 安全政策阻止頁面讀取；依政策不得改用其他瀏覽器介面、raw CDP 或間接方式繞過。
- 因此本輪沒有新增可視化截圖，也不宣稱三種 viewport 的實際點擊驗收已完成。Draft PR Review 應在允許 localhost 的人工環境補驗 Layers Control 展開、圖層切換、浮動圖例位置及無水平捲動。
- Console／Network：因同一瀏覽器政策阻擋而無法取得本輪 DevTools 證據；HTTP 層已確認頁面與 Worker health 正常。

## 已知限制

- Esri World Imagery 需要瀏覽器可連線至 ArcGIS tile service。
- Esri Layers Control 的行動版展開與 390px／360px 視覺結果仍需人工 localhost UAT 補證。
- ImageOverlay 仍使用 geometry 的 axis-aligned bounds；Polygon 外部透明度由 Process API geometry 與 dataMask 保證。
- 本輪沒有部署 GitHub Pages 或 Cloudflare Worker，因此正式網站仍顯示 main 既有版本，直到 Hotfix Review 與後續合併／部署流程完成。
- 本輪刻意不實作 point NDVI Identify：現有 PNG 是五級顏色分類影像，無法可靠反推出連續 NDVI 數值；正確 Identify 需要獨立像素查詢契約，應由後續 API／產品規格處理，避免把顏色誤當數值。

## Branch、Commit、PR

- Branch：`hotfix/ndvi-gis-viewer-v63`。
- 原 Commit：`fix: add NDVI GIS viewer with satellite basemap`。
- 本輪 Commit：`fix: polish NDVI GIS viewer controls and legend`（完成後補 Head SHA）。
- Draft PR：#5，base `main`；維持 Draft，不 Merge。

## 範圍確認

- 未修改 Worker Public API、route、schema、service 或 OpenAPI endpoint。
- 未重新部署 Cloudflare Worker。
- 未開始 Satellite Observation Center。
- 未刪除或變更 Farm Memory、selected field localStorage 或已儲存 NDVI 紀錄。
