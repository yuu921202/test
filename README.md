# 🌍 旅遊規劃小程式

AI 自動為你規劃完美的旅程！輸入目的地、天數、預算和興趣，系統自動產出行程表和地圖路線。

## 📋 核心功能

- ✈️ **智能行程規劃** — 根據興趣標籤和預算自動篩選景點
- 🗺️ **互動地圖** — 視覺化每日路線和景點位置
- 🍽️ **用餐建議** — 每日用餐推薦
- 📱 **響應式設計** — 手機和桌面友善

## 🛠️ 技術棧

### 後端
- **FastAPI** — 現代 Python Web 框架
- **Google Places API** — 景點和餐廳資料
- **Python 3.8+**

### 前端
- **React 18** — UI 框架
- **Vite** — 快速開發伺服器
- **Leaflet.js** — 地圖渲染
- **Axios** — HTTP 請求

### 資料庫
- **SQLite** — 本機儲存（選配）

## 🚀 快速開始

### 1️⃣ 準備後端

```bash
cd backend
pip install -r requirements.txt
```

**設定 Google API 金鑰：**
```bash
cp .env.example .env
# 編輯 .env，填入你的 GOOGLE_MAPS_API_KEY
```

**啟動後端服務：**
```bash
python main.py
```
後端將在 `http://localhost:8000` 運行

### 2️⃣ 準備前端

```bash
cd frontend
npm install
```

**啟動前端開發伺服器：**
```bash
npm run dev
```
前端將在 `http://localhost:5173` 自動開啟

### 3️⃣ 測試流程

1. 輸入目的地（例如：東京）
2. 選擇天數（3-5 天最佳展示效果）
3. 選擇預算（經濟型、標準型或豪華型）
4. 選擇至少一個興趣標籤
5. 點擊「開始規劃行程」

## 📊 10分鐘演示流程

### Demo 腳本
1. **介紹背景**（30秒）
   - 「今天展示的是 AI 旅遊規劃工具」
   - 「輸入喜好，自動產生完整行程」

2. **演示表單**（1分鐘）
   - 輸入「東京」
   - 選「5 天」
   - 選「標準型」預算
   - 選「美食」+「歷史古蹟」+「文青」

3. **顯示結果**（3分鐘）
   - 展示行程時間軸（講解如何安排景點）
   - 放大地圖展示（強調路線最佳化 — 同一天的景點相近）
   - 說明演算法邏輯（自動篩選、評分排序、地理聚類）

4. **互動演示**（3分鐘）
   - 改變預算為「豪華型」，重新規劃
   - 點擊地圖標記查看景點詳情何動畫
   - 解釋用餐推薦邏輯

5. **展望未來**（2分鐘）
   - 「可以接 DB 存使用者行程」
   - 「可以加 Google Directions API 算交通時間」
   - 「可以整合訂房和餐廳預約」

## 🔧 項目結構

```
旅遊規劃小程式/
├── backend/
│   ├── main.py           # FastAPI 主應用
│   ├── requirements.txt   # Python 依賴
│   └── .env.example      # 環境變數範例
└── frontend/
    ├── src/
    │   ├── components/   # React 元件
    │   ├── App.jsx
    │   └── index.css
    ├── package.json
    ├── vite.config.js
    └── index.html
```

## 🎨 核心邏輯

### 後端流程
1. **`fetch_attractions()`** — Google Places API 抓景點
2. **`filter_and_rank()`** — 按評分和興趣篩選
3. **`organize_by_days()`** — 按天數分組（簡單均分，可升級為地理聚類）
4. **`add_meals()`** — 加上每日餐廳建議

### 前端流程
1. **TripForm** — 表單輸入
2. **TripPlan** — 時間軸展示
3. **TripMap** — Leaflet 地圖視覺化

## 🌟 亮點優化（可選）

### 短期優化
- [ ] K-means 景點聚類（減少交通時間）
- [ ] 景點快取（減少 API 呼叫）
- [ ] 使用者行程收藏（SQLite）

### 中期優化
- [ ] Google Directions API 整合（實時交通時間）
- [ ] 天氣預報（避免雨天）
- [ ] 售票整合（景點優惠券）

### 長期優化
- [ ] 多語言支持
- [ ] 社群評論和照片
- [ ] AI 聊天助手（客製化調整行程）

## 📱 常見問題

**Q: 沒有 Google API 金鑰怎麼辦？**
A: [申請免費 Google Cloud 帳戶](https://cloud.google.com)，啟用 Places API 和 Maps API 即可

**Q: 能在手機上運行嗎？**
A: 可以！Vite 支援手機訪問（同網路下輸入 IP 地址）

**Q: 怎樣加入資料庫？**
A: 在 `backend/main.py` 加上 SQLite 儲存用戶行程的邏輯

## 📝 授權

MIT License

---

**祝你旅遊規劃愉快！🎉**
