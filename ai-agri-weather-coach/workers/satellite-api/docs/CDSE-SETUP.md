# CDSE 設定

1. 在 Copernicus Data Space Ecosystem 建立 OAuth Client。
2. 本機複製 `.dev.vars.example` 為 `.dev.vars`，填入 `CDSE_CLIENT_ID` 與 `CDSE_CLIENT_SECRET`。
3. 執行 `npx.cmd wrangler dev`，再呼叫 `GET /api/v1/cdse/status`。
4. Cloudflare 正式環境使用：

```powershell
npx.cmd wrangler secret put CDSE_CLIENT_ID
npx.cmd wrangler secret put CDSE_CLIENT_SECRET
```

OAuth 採 Client Credentials Flow。Token 由 `src/services/cdse-auth.js` 在 Worker isolate 記憶體內快取，並預留到期安全緩衝；不得新增第二套 OAuth 流程或將 Token 傳給瀏覽器。

若回傳 `CDSE_NOT_CONFIGURED`，檢查 Secrets 是否存在；401 通常代表憑證或 Token 被拒絕；403 為權限不足；429 為配額或速率限制。
