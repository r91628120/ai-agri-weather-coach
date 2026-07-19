# AIAKOS Handoff 規範

## Handoff 用途

`handoff/` 用於保存跨工作階段、跨工具與跨協作者的正式交接紀錄，讓接手者能確認目標、實作範圍、驗證證據、未完成事項與安全邊界。Handoff 是交接證據，不取代原始程式、測試、API 文件或 Git 歷史。

## 命名規則

新紀錄使用：

```text
YYYY-MM-DD-主題-handoff.md
```

主題使用小寫 kebab-case，例如：`2026-07-19-ndvi-statistical-api-v1-handoff.md`。

## 必填章節

每份 Handoff 至少包含：

1. 本次目標
2. 已完成功能
3. 修改檔案
4. 測試結果
5. 尚未完成項目
6. 已知限制
7. 部署與環境設定
8. Branch 與 PR
9. 下一步
10. 接手注意事項

## 安全規則

- 不得記錄 Secret、Access Token、Authorization Header、密碼或完整環境變數。
- 只能記錄 Secret 的變數名稱、設定位置與是否完成，不得記錄值。
- 測試證據應保留狀態碼與安全化統計，不得貼出敏感 request/response header。

## 保存規則

- 舊 Handoff 紀錄不得覆寫、改名或回收成新用途。
- 後續進度建立新日期／新主題紀錄，或在明確保留歷史脈絡的前提下追加狀態。
- 不確定的歷史資訊必須標示為待確認，不得猜測補齊。
