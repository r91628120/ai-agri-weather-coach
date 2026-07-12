# AIAKOS OS（智慧農業作業系統）
# hand_off.md

Version: v1.0
Last Updated: 2026-07-12

---

# 專案定位

AIAKOS OS（AI Agricultural Knowledge Operating System）

是一套以 AI 為核心的智慧農業作業系統。

本專案不是單純網站，而是長期發展的智慧農業平台，整合：

- AI 農業氣象
- AI 農業決策
- 衛星遙測
- IoT 感測器
- 農場知識庫
- AI Agent
- 教育推演系統

所有開發皆以模組化、可擴充、可維護為最高原則。

---

# 開發原則

Codex 不負責創意發想。

ChatGPT 負責：

- 系統架構
- 功能規劃
- UX
- 教育流程
- AI 邏輯
- 系統藍圖

Codex 負責：

- 撰寫程式
- 重構
- 修正 Bug
- API 串接
- 自動化
- 測試
- 維護

不得自行改變系統架構。

---

# AIAKOS OS 架構

目前規劃：

AIAKOS OS

├── Weather Center
├── Farm Memory
├── Farm Boundary Center
├── Satellite Center
├── AI Weather Coach
├── Disease AI
├── Pest AI
├── IoT Center
├── MQTT Center
├── AI Decision Center
└── Education Center

所有模組皆可獨立運作。

---

# Satellite Center

目前進度：

✅ Copernicus Data Space 帳號建立完成

✅ OAuth Client 建立完成

使用：

Client Credentials Flow

用途：

- Process API
- Statistical API

未來 Secret 必須存放於：

Cloudflare Secrets

不得放於：

- GitHub
- index.html
- JavaScript
- Repository

---

# Satellite API 開發順序

第一階段：

□ OAuth

□ Process API

□ Statistical API

第二階段：

□ NDVI

□ RGB

□ 雲量

□ 最新影像

第三階段：

□ NDVI Time Series

□ 生長趨勢

□ AI 判讀

第四階段：

□ AI Weather Coach 整合

---

# Farm Boundary Center

目標：

建立農地 GeoJSON。

每塊農地包含：

- 名稱
- 座標
- Polygon
- 面積
- 作物
- 建立日期
- 擁有人

所有衛星分析皆依據 Polygon。

---

# AI Weather Coach

未來整合：

- 農業氣象
- NDVI
- 雨量
- 氣溫
- 日照
- 濕度
- 病害風險
- 巡田建議

AI 必須提供：

1. 現況

2. 原因分析

3. 建議措施

4. 是否需立即巡田

---

# Farm Memory

建立農場知識庫。

未來 AI 可查詢：

- 工作紀錄
- 栽培紀錄
- 肥料
- 農藥
- 感測器
- 巡田紀錄
- AI 建議

目的：

建立長期農場記憶。

---

# IoT Center

未來整合：

ESP32

MQTT

LoRa

WiFi

Sensor

控制：

- 灌溉

- 風扇

- 溫室

- 馬達

- 繼電器

---

# MQTT

目前已有 MQTT VIP。

待 Satellite API 完成後再開始整合。

---

# 開發優先順序

Priority 1

Satellite API

Priority 2

Farm Boundary Center

Priority 3

NDVI

Priority 4

Weather Coach

Priority 5

Farm Memory

Priority 6

IoT

Priority 7

AI Decision Center

---

# 系統原則

所有功能：

必須模組化。

不得：

- 寫死資料
- 重複程式
- 相互耦合

所有 API：

必須獨立封裝。

---

# Git 原則

每完成一個模組：

Lint

Build

Test

Git Status

Commit

不得一次修改多個模組。

---

# 最終目標

打造：

AIAKOS OS

成為一套真正可用於：

- 教育
- 農場
- 智慧農業
- AI 決策
- IoT
- 衛星分析

的智慧農業作業系統。

所有新增功能必須符合：

可維護

可測試

可擴充

不得破壞既有架構。

End of hand_off.md