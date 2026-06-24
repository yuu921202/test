# 旅遊規劃工具 - 示範資料

## 東京 5 天行程 範例輸入

```json
{
  "destination": "東京",
  "days": 5,
  "budget": "medium",
  "interests": ["food", "history", "shopping"]
}
```

## 東京景點資料集（用於本地測試或備份）

如果 Google Places API 無法取得足夠景點，可參考以下資料結構：

```json
[
  {
    "name": "淺草寺",
    "location": {"lat": 35.7149, "lng": 139.7926},
    "rating": 4.6,
    "opening_hours": {"open": "06:00", "close": "17:00"},
    "type": "historical",
    "duration_minutes": 90,
    "intensity_score": 3,
    "category": "history"
  },
  {
    "name": "東京晴空塔",
    "location": {"lat": 35.7100, "lng": 139.8107},
    "rating": 4.5,
    "opening_hours": {"open": "08:00", "close": "22:00"},
    "type": "landmark",
    "duration_minutes": 120,
    "intensity_score": 2,
    "category": "history"
  },
  {
    "name": "築地外市場",
    "location": {"lat": 35.6646, "lng": 139.7716},
    "rating": 4.3,
    "opening_hours": {"open": "05:00", "close": "14:00"},
    "type": "restaurant",
    "duration_minutes": 60,
    "intensity_score": 1,
    "category": "food"
  },
  {
    "name": "新宿歌舞伎町",
    "location": {"lat": 35.6954, "lng": 139.7034},
    "rating": 4.2,
    "opening_hours": {"open": "10:00", "close": "23:00"},
    "type": "shopping_mall",
    "duration_minutes": 120,
    "intensity_score": 2,
    "category": "shopping"
  },
  {
    "name": "澀谷十字路口",
    "location": {"lat": 35.6595, "lng": 139.7004},
    "rating": 4.4,
    "opening_hours": {"open": "08:00", "close": "23:00"},
    "type": "shopping_mall",
    "duration_minutes": 90,
    "intensity_score": 2,
    "category": "shopping"
  },
  {
    "name": "銀座和光百貨",
    "location": {"lat": 35.6730, "lng": 139.7648},
    "rating": 4.4,
    "opening_hours": {"open": "10:00", "close": "20:00"},
    "type": "shopping_mall",
    "duration_minutes": 120,
    "intensity_score": 2,
    "category": "shopping"
  },
  {
    "name": "上野恩賜公園",
    "location": {"lat": 35.7155, "lng": 139.7736},
    "rating": 4.5,
    "opening_hours": {"open": "09:00", "close": "17:00"},
    "type": "park",
    "duration_minutes": 120,
    "intensity_score": 3,
    "category": "history"
  },
  {
    "name": "國立博物館",
    "location": {"lat": 35.7195, "lng": 139.7766},
    "rating": 4.6,
    "opening_hours": {"open": "09:30", "close": "17:00"},
    "type": "museum",
    "duration_minutes": 150,
    "intensity_score": 2,
    "category": "history"
  },
  {
    "name": "鮨誠（米其林餐廳）",
    "location": {"lat": 35.6722, "lng": 139.7595},
    "rating": 4.8,
    "opening_hours": {"open": "17:00", "close": "23:00"},
    "type": "restaurant",
    "duration_minutes": 90,
    "intensity_score": 1,
    "category": "food"
  },
  {
    "name": "六本木之丘",
    "location": {"lat": 35.6627, "lng": 139.7308},
    "rating": 4.3,
    "opening_hours": {"open": "10:00", "close": "23:00"},
    "type": "shopping_mall",
    "duration_minutes": 120,
    "intensity_score": 2,
    "category": "shopping"
  }
]
```

## 演算法預期行為

### 地理聚類（K-means）
- **天數**: 5 天
- **分群邏輯**: 
  - 第 1 群（北）：淺草寺、東京晴空塔、國立博物館（同一區域）
  - 第 2 群（東）：上野恩賜公園
  - 第 3 群（中）：築地外市場
  - 第 4 群（西南）：澀谷十字路口、銀座
  - 第 5 群（西北）：新宿、六本木

### 體力分配預期
- **築地外市場** (強度1) + **澀谷十字路口** (強度2) + **銀座** (強度2) = **日均強度 5/10 ✅ 輕鬆**
- **上野** (強度3) + **國立博物館** (強度2) + **淺草寺** (強度3) = **日均強度 8/10 ⚠️ 較耗體力**

### 距離說明預期
- 「距離上一站 900m，同區域景點」（淺草寺 → 東京晴空塔）
- 「距離上一站 3.2km，規劃為下一區域」（上野 → 新宿）

## 本地測試方法

如果 API 返回資料不完整，可以：

1. **改 backend/main.py**：在 `fetch_attractions()` 函數後加上本地資料備份
2. **或直接用 Postman 測試**：
   ```bash
   POST http://localhost:8000/plan
   Content-Type: application/json
   
   {
     "destination": "東京",
     "days": 5,
     "budget": "medium",
     "interests": ["food", "history", "shopping"]
   }
   ```

3. **查看 API 響應結構**：確認每個景點都有 `intensity_score` 和 `reason` 欄位
