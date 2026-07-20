# AIAKOS V6.3 NDVI First Render and Guidance Hotfix Handoff

- 目標：修正首次取得 PNG 時 GIS Viewer 尺寸尚未穩定造成 Overlay 偶發未顯示，並補上選取觀測後的下一步提示及透明 PNG 下載語意。
- 首次 render：顯示 GIS 模式後等待下一個 animation frame，依序執行 `invalidateSize()`、建立新 ImageOverlay、再次 `invalidateSize()`、`fitBounds()`；沿用單一 Leaflet map，先移除舊 Overlay，最後維持 Polygon 在最上層。
- 操作提示：選卡後顯示日期／雲量與「取得 NDVI 彩色影像」下一步，平滑捲動並讓按鈕高亮約 2 秒；不自動呼叫 Image API。
- 下載語意：明確標示下載為 NDVI 透明 PNG，不包含 Esri 底圖或農地邊界。
- 修改範圍：`index.html`、必要前端測試與本 Handoff；Worker API、GIS Viewer 功能邊界與部署均未變更。
- 驗證：`npm test` 65/65、`npm run lint`、`git diff --check`、4 個 inline JavaScript syntax checks 全部通過；首次有效 PNG 的單次 render 時序測試通過。
- Branch：`hotfix/ndvi-first-render-and-guidance-v63`。
- Commit／Draft PR：完成後建立並回填於 PR 紀錄。
