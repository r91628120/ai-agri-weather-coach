# AIAKOS Satellite Service Enterprise v1.0

本 Worker 是 AIAKOS 的衛星資料服務層，以 Cloudflare Workers、Hono 與 Copernicus Data Space Ecosystem（CDSE）建置。正式提供 Sentinel-2 L2A 觀測搜尋、農地 NDVI 統計與 NDVI 彩色 PNG；歷史與 AI 分析端點仍為版本化預留介面。

## 本機安裝

```powershell
cd D:\AIAKOS-Workspace\ai-agri-weather-coach\ai-agri-weather-coach\workers\satellite-api
npm.cmd install
Copy-Item .dev.vars.example .dev.vars
```

在 `.dev.vars` 填入個人 CDSE OAuth Client Credentials。此檔已由 Git 忽略，不得提交。

```env
CDSE_CLIENT_ID="..."
CDSE_CLIENT_SECRET="..."
```

啟動與測試：

```powershell
npm.cmd test
npm.cmd run lint
npx.cmd wrangler dev
```

```powershell
curl.exe http://127.0.0.1:8787/api/v1/health
curl.exe http://127.0.0.1:8787/api/v1/cdse/status
curl.exe -X POST http://127.0.0.1:8787/api/v1/ndvi/statistics -H "Content-Type: application/json" --data-binary "@tests/fixtures/valid-polygon.json"
```

## 部署

先將密鑰寫入 Cloudflare Secrets，再部署：

```powershell
npx.cmd wrangler secret put CDSE_CLIENT_ID
npx.cmd wrangler secret put CDSE_CLIENT_SECRET
npm.cmd run deploy
```

## 安全提醒

- Client ID、Client Secret 與 Access Token 不可放入前端、Git、log 或 API 回應。
- `.dev.vars.example` 僅提供變數名稱與示意值。
- NDVI 請求只接受 `application/json`，上限 64 KiB，最長查詢期間 366 天。
- 正式環境錯誤只回傳安全摘要，不回傳 stack 或 CDSE 原始回應。

詳細介面見 [NDVI-STATISTICAL-API.md](./NDVI-STATISTICAL-API.md)、[SATELLITE-SEARCH-API.md](./SATELLITE-SEARCH-API.md) 與 [NDVI-IMAGE-API.md](./NDVI-IMAGE-API.md)，架構見 [SATELLITE-ARCHITECTURE.md](./SATELLITE-ARCHITECTURE.md)。
