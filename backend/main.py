from dotenv import load_dotenv
load_dotenv()  # 在任何其他导入之前加载环境变量

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Tuple
import googlemaps
import os
from sklearn.cluster import KMeans
import numpy as np
import math
from datetime import time, datetime
import json
import re
from services.nim_service import call_nim, NIM_MODEL

# 排除清單：過濾掉不適合觀光的地點類型
EXCLUDED_TYPES = {"lodging", "hotel", "hospital", "transit_station", "police", "fire_station", "atm"}

# 景點類型 -> 建議停留時間（分鐘）
DURATION_MAP = {
    "museum": 90,
    "art_gallery": 90,
    "park": 90,
    "natural_feature": 120,
    "restaurant": 60,
    "cafe": 30,
    "shopping_mall": 90,
    "store": 60,
    "amusement_park": 180,
    "zoo": 120,
    "historical": 75,
}

app = FastAPI(title="旅遊規劃 API")

# 全局快取
_request_cache = {}  # 請求層級快取：key = "{destination}:{sorted(interests)}:{days}:{budget}"
_attractions_cache = {}  # 景點快取：key = "{destination}:{place_type}"

# CORS 設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化 Google Maps 客戶端
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
gmaps = googlemaps.Client(key=GOOGLE_MAPS_API_KEY)

# 資料模型
class PreferenceRequest(BaseModel):
    description: str

class TripRequest(BaseModel):
    destination: str
    days: int
    budget: str  # "low", "medium", "high"
    interests: List[str]

class OpeningHours(BaseModel):
    open: str  # "09:00"
    close: str  # "18:00"

class Attraction(BaseModel):
    name: str
    location: dict
    rating: float
    opening_hours: Optional[OpeningHours] = None
    type: str
    duration_minutes: int
    intensity_score: int = 3  # 1-5, 預設 3
    category: str = "poi"
    # 景點詳細信息
    address: Optional[str] = None
    phone_number: Optional[str] = None
    website: Optional[str] = None
    place_id: Optional[str] = None  # 用於獲取詳細信息

class AttractionWithLogic(BaseModel):
    name: str
    location: dict
    rating: float
    opening_hours: Optional[OpeningHours] = None
    type: str
    duration_minutes: int
    intensity_score: int
    category: str
    distance_to_previous: Optional[float] = None  # 公尺
    travel_time_to_previous: Optional[int] = None  # 分鐘（交通時間）
    reason: str = ""  # 為什麼在這個位置
    # 景點詳細信息
    address: Optional[str] = None
    phone_number: Optional[str] = None
    website: Optional[str] = None
    place_id: Optional[str] = None

class DailyItinerary(BaseModel):
    day: int
    attractions: List[AttractionWithLogic]
    meals: List[dict]
    daily_intensity: int = 0
    daily_intensity_note: str = ""

class TripPlan(BaseModel):
    destination: str
    days: int
    budget: str
    itinerary: List[DailyItinerary]

@app.get("/")
def read_root():
    return {"message": "旅遊規劃 API 已啟動"}

@app.get("/place-details/{place_id}")
def get_place_details_endpoint(place_id: str):
    """
    按需獲取景點詳細信息（電話、網站、評論）
    僅在前端打開詳情卡片時呼叫（減少初始規劃的 API 開銷）
    """
    details = get_place_details(place_id, fetch=True)
    if not details:
        return {"error": "無法獲取詳細信息"}
    return details

def parse_preference_with_ai(description: str) -> Dict:
    """
    用 AI 解析用户的自然语言偏好描述，转换为结构化的旅游参数

    Args:
        description: 用户输入的偏好描述，例如 "我要去台北想休闲点，喜欢拍照"

    Returns:
        {
            "destination": "台北",  # 如果有提到地名就填，否则空字串
            "interests": ["nature", "food", ...],  # 从固定清单选取
            "budget": "low|medium|high",
            "max_intensity_hint": 1-10,
            "reasoning": "为什么这样判断的说明",
            "success": True
        }

        失败时返回 fallback：
        {
            "destination": "",
            "interests": [],
            "budget": "medium",
            "max_intensity_hint": 7,
            "reasoning": "AI 解析失败，请手动选择偏好",
            "success": False
        }
    """
    VALID_INTERESTS = ["nature", "food", "history", "shopping", "family", "art"]
    VALID_BUDGETS = ["low", "medium", "high"]

    fallback_result = {
        "destination": "",
        "interests": [],
        "budget": "medium",
        "max_intensity_hint": 7,
        "reasoning": "AI 解析失败，请手动选择偏好",
        "success": False
    }

    system_prompt = f"""你是旅游偏好解析助手。任务：把用户的自然语言描述转换成 JSON。

【必须返回的字段】（缺一不可）：
- destination（字符串）：如果用户提到地名，填地名；否则填空字串""
- interests（数组）：只能从这个清单选：{VALID_INTERESTS}
- budget（字符串）：只能是这三个之一：{VALID_BUDGETS}
- max_intensity_hint（数字）：1-10 整数
- reasoning（字符串）：一句话说明判断理由

【详细规则】：
1. destination：如果用户说"我要去台北"、"在日本"、"巴黎旅游"等，就提取地名。如果完全没提地名，填""（空字串）。不要瞎猜地名。
2. interests：从 {VALID_INTERESTS} 中选择。
3. budget：从 {VALID_BUDGETS} 中选一个。如果没提，默认 medium。
4. max_intensity_hint：
   - 1-3：用户说悠闲、放松、不累
   - 4-5：中等强度
   - 6-7：没说明，用默认值 7
   - 8-9：想走透透、紧凑、看多景点
   - 10：非常繁忙、强度最高
5. reasoning：说明判断理由。如果有识别出目的地，写成："用户提到[地名]，设定目的地为[地名]；同时选择了[兴趣]，预算为[预算]"

【输出要求】：
- 只返回纯 JSON，不要其他文字
- 必须包含这 5 个字段
- JSON 必须有效，可以被 json.loads() 解析

返回示例：
{{
  "destination": "台北",
  "interests": ["shopping", "food"],
  "budget": "medium",
  "max_intensity_hint": 5,
  "reasoning": "用户提到台北，设定目的地为台北；选择了购物和美食，预算为标准型，体力强度中等"
}}

另一个示例（无地名）：
{{
  "destination": "",
  "interests": ["nature"],
  "budget": "low",
  "max_intensity_hint": 3,
  "reasoning": "用户没有提到地名，目的地为空；选择了自然风景，预算为经济，体力强度很低因为说了悠闲"
}}"""

    user_prompt = description

    try:
        # 调用 NIM API
        response = call_nim(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=300,
            temperature=0.5
        )

        if not response:
            print("[偏好解析] NIM API 调用失败，使用 fallback")
            return fallback_result

        # 尝试直接解析 JSON
        try:
            result = json.loads(response)
        except json.JSONDecodeError:
            # 如果直接解析失败，尝试用正则提取 JSON 部分
            print(f"[偏好解析] 直接 JSON 解析失败，尝试正则提取")
            match = re.search(r'\{.*\}', response, re.DOTALL)
            if match:
                try:
                    result = json.loads(match.group())
                except json.JSONDecodeError:
                    print(f"[偏好解析] 正则提取后仍然解析失败: {response}")
                    return fallback_result
            else:
                print(f"[偏好解析] 无法从响应中找到 JSON: {response}")
                return fallback_result

        # 验证和清理结果
        destination = result.get("destination", "")
        if not isinstance(destination, str):
            destination = ""
        destination = destination.strip()  # 去除空格

        interests = result.get("interests", [])
        if not isinstance(interests, list):
            interests = []
        # 只保留有效的兴趣标签
        interests = [i for i in interests if i in VALID_INTERESTS]

        budget = result.get("budget", "medium")
        if budget not in VALID_BUDGETS:
            budget = "medium"

        max_intensity = result.get("max_intensity_hint", 7)
        if not isinstance(max_intensity, int) or max_intensity < 1 or max_intensity > 10:
            max_intensity = 7

        reasoning = result.get("reasoning", "根据用户输入自动推断")
        if not isinstance(reasoning, str):
            reasoning = "根据用户输入自动推断"
        reasoning = reasoning[:150]  # 限制长度（增加到 150 以容纳目的地说明）

        log_dest = f'"{destination}"' if destination else "无"
        print(f"[偏好解析] 成功: destination={log_dest}, interests={interests}, budget={budget}, intensity={max_intensity}")

        return {
            "destination": destination,
            "interests": interests,
            "budget": budget,
            "max_intensity_hint": max_intensity,
            "reasoning": reasoning,
            "success": True
        }

    except Exception as e:
        print(f"[偏好解析] 异常: {type(e).__name__} - {str(e)}")
        import traceback
        traceback.print_exc()
        return fallback_result


@app.post("/parse-preference")
def parse_preference(request: PreferenceRequest):
    """
    AI 解析用户的旅游偏好

    输入：{ "description": "用户用一句话描述的旅行偏好" }
    输出：结构化的偏好参数（interests, budget, max_intensity_hint, reasoning）
    """
    result = parse_preference_with_ai(request.description)
    return result


@app.get("/test-nim")
def test_nim_api():
    """
    測試 NVIDIA NIM API 配置
    用於驗證 API 金鑰設置、連線和回應格式
    """
    test_prompt = "請用一句話介紹台灣的特色美食。"

    result = call_nim(
        system_prompt="你是一個友善的旅遊助手。",
        user_prompt=test_prompt,
        max_tokens=100,
        temperature=0.7
    )

    if result:
        return {
            "status": "success",
            "model": NIM_MODEL,
            "test_prompt": test_prompt,
            "response": result,
            "message": "✓ NIM API 連線正常，可以開始使用"
        }
    else:
        return {
            "status": "error",
            "model": NIM_MODEL,
            "test_prompt": test_prompt,
            "response": None,
            "message": "✗ NIM API 呼叫失敗。請檢查：1) NVIDIA_NIM_API_KEY 是否設置；2) API 金鑰是否有效；3) 網路連線是否正常；4) 帳戶額度是否用完"
        }

@app.post("/plan")
def create_trip_plan(request: TripRequest) -> TripPlan:
    """
    核心邏輯：根據用戶輸入生成行程規劃
    """
    try:
        # 請求層級快取：檢查是否已經計算過相同參數的行程
        cache_key = f"{request.destination}:{','.join(sorted(request.interests))}:{request.days}:{request.budget}"
        if cache_key in _request_cache:
            print(f"[快取命中] {cache_key}")
            return _request_cache[cache_key]

        # 1. 抓景點
        attractions = fetch_attractions(request.destination, request.interests)

        # 獲取目的地座標（用於後續用餐分配）
        try:
            geocode_result = gmaps.geocode(request.destination)
            destination_lat = geocode_result[0]["geometry"]["location"]["lat"] if geocode_result else 0
            destination_lng = geocode_result[0]["geometry"]["location"]["lng"] if geocode_result else 0
        except:
            destination_lat = 0
            destination_lng = 0

        # 2. 按興趣篩選 + 排序
        filtered = filter_and_rank(attractions, request.interests, request.budget)

        # 3. 地理聚類分組
        daily_plans = cluster_attractions_by_location(filtered, request.days)

        # 4. 驗證開放時間並調整順序
        daily_plans = [validate_opening_hours(day) for day in daily_plans]

        # 5. 體力平衡（需要考慮相鄰的日程）
        balanced_daily_plans = []
        for day_idx, day_schedule in enumerate(daily_plans):
            next_schedule = daily_plans[day_idx + 1] if day_idx + 1 < len(daily_plans) else None
            balanced_day = balance_daily_intensity(day_schedule, max_intensity=10, next_day_schedule=next_schedule)
            balanced_daily_plans.append(balanced_day)

        daily_plans = balanced_daily_plans

        # 6. 加上餐點建議（使用真實餐廳數據）
        itinerary = add_meals(daily_plans, request.destination, request.budget, request.interests, destination_lat, destination_lng)

        # 日誌：印出統計信息
        total_attractions = sum(len(day.attractions) for day in itinerary)
        print("\n" + "=" * 50)
        print(f"✓ 行程規劃完成")
        print(f"  目的地: {request.destination}")
        print(f"  天數: {request.days}")
        print(f"  景點總數: {total_attractions}")
        print(f"  快取狀態: 請求快取 {'已存儲' if cache_key in _request_cache else '無'}")
        print("=" * 50 + "\n")

        result = TripPlan(
            destination=request.destination,
            days=request.days,
            budget=request.budget,
            itinerary=itinerary
        )

        # 存入快取供下次相同請求使用
        _request_cache[cache_key] = result
        print(f"[快取存儲] {cache_key}")

        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}

def fetch_attractions(destination: str, interests: List[str]):
    """
    從 Google Places API 抓景點，並補充演算法所需欄位

    優化：
    1. 限制最多 3 個興趣標籤（減少 API 呼叫）
    2. 景點級快取（同一 destination + type 不重複呼叫）
    3. 從 places_nearby 結果直接提取 vicinity 作為簡化地址（不需額外呼叫 get_place_details）
    """
    place_types = {
        "nature": ["park", "natural_feature"],
        "food": ["restaurant", "cafe"],
        "history": ["museum", "historical"],
        "shopping": ["shopping_mall", "store"],
        "family": ["amusement_park", "zoo"],
        "art": ["art_gallery", "museum"]
    }

    # 預設強度值（景點類型 -> 強度）
    intensity_map = {
        "park": 3,
        "natural_feature": 4,
        "restaurant": 1,
        "cafe": 1,
        "museum": 2,
        "historical": 3,
        "shopping_mall": 2,
        "store": 2,
        "amusement_park": 4,
        "zoo": 3,
        "art_gallery": 2,
    }

    attractions = []
    try:
        # 先找目的地座標
        geocode_result = gmaps.geocode(destination)
        if not geocode_result:
            return []

        lat = geocode_result[0]["geometry"]["location"]["lat"]
        lng = geocode_result[0]["geometry"]["location"]["lng"]

        # 限制最多 3 個興趣標籤（減少 API 呼叫）
        limited_interests = interests[:3]
        if len(interests) > 3:
            print(f"[提示] 限制只處理前 3 個興趣（使用者選了 {len(interests)} 個）")

        # 根據興趣標籤搜尋景點
        for interest in limited_interests:
            types = place_types.get(interest, [])
            for place_type in types:
                # 景點級快取：檢查是否已經搜尋過相同的 destination + type
                cache_key = f"{destination}:{place_type}"
                if cache_key in _attractions_cache:
                    print(f"[景點快取命中] {cache_key}")
                    attractions.extend(_attractions_cache[cache_key])
                    continue

                # 呼叫 places_nearby API
                places_result = gmaps.places_nearby(
                    location=(lat, lng),
                    radius=20000,
                    type=place_type
                )

                type_attractions = []
                for place in places_result.get("results", [])[:5]:
                    # 過濾排除清單中的地點類型
                    place_types_list = place.get("types", [])
                    if any(excluded in place_types_list for excluded in EXCLUDED_TYPES):
                        continue

                    loc = place.get("geometry", {}).get("location", {})

                    # 使用 DURATION_MAP 查表，找不到則預設 60 分
                    duration = DURATION_MAP.get(place_type, 60)

                    # 獲取 place_id 和 vicinity（簡化地址，無需額外 API 呼叫）
                    place_id = place.get("place_id", "")
                    vicinity = place.get("vicinity", "")  # 從 places_nearby 直接取得簡化地址

                    attraction = {
                        "name": place.get("name", ""),
                        "location": {"lat": loc.get("lat", 0), "lng": loc.get("lng", 0)},
                        "rating": place.get("rating", 0),
                        "opening_hours": parse_opening_hours(place.get("opening_hours", {})),
                        "type": place_type,
                        "duration_minutes": duration,
                        "intensity_score": intensity_map.get(place_type, 3),
                        "category": interest,
                        "place_id": place_id,
                        "address": vicinity,  # 簡化地址（無需額外 API）
                        "phone_number": None,  # 需要時才呼叫 get_place_details
                        "website": None  # 需要時才呼叫 get_place_details
                    }
                    type_attractions.append(attraction)
                    attractions.append(attraction)

                # 存入景點快取
                if type_attractions:
                    _attractions_cache[cache_key] = type_attractions
                    print(f"[景點快取存儲] {cache_key} ({len(type_attractions)} 筆)")
    except Exception as e:
        print(f"Error fetching attractions: {e}")

    return attractions


def get_place_details(place_id: str, fetch: bool = False) -> Dict:
    """
    獲取景點詳細信息（地址、電話、網站等）

    fetch=False 時（預設）：不呼叫 API，節省配額
    fetch=True 時：呼叫 gmaps.place()（昂貴操作，僅在詳情面板被打開時呼叫）
    """
    if not fetch or not place_id:
        return {}

    try:
        place_details = gmaps.place(place_id)
        result = place_details.get("result", {})

        return {
            "address": result.get("formatted_address", ""),
            "phone_number": result.get("formatted_phone_number", ""),
            "website": result.get("website", ""),
            "reviews": result.get("reviews", [])[:3]  # 前 3 條評論
        }
    except Exception as e:
        print(f"Error fetching place details for {place_id}: {e}")
        return {}


def parse_opening_hours(opening_hours_data: dict) -> Optional[OpeningHours]:
    """
    解析 Google Places API 的營業時間
    """
    try:
        if not opening_hours_data or "periods" not in opening_hours_data:
            return None

        periods = opening_hours_data.get("periods", [])
        if not periods or len(periods) == 0:
            return None

        # 取第一個時段（通常是最常見的營業時間）
        period = periods[0]
        open_time = period.get("open", {})
        close_time = period.get("close", {})

        open_hour = open_time.get("time", "09:00")
        close_hour = close_time.get("time", "18:00")

        return OpeningHours(
            open=f"{open_hour[:2]}:{open_hour[2:]}",
            close=f"{close_hour[:2]}:{close_hour[2:]}"
        )
    except:
        return None

def filter_and_rank(attractions, interests, budget):
    """
    按評分和興趣篩選景點
    """
    # 過濾無效座標的景點
    valid_attractions = [a for a in attractions if a.get("location", {}).get("lat") and a.get("location", {}).get("lng")]

    # 按評分排序（高評分優先）
    sorted_attractions = sorted(valid_attractions, key=lambda x: x["rating"], reverse=True)

    # 依預算決定數量（簡單規則）
    if budget == "low":
        limit = max(3, len(sorted_attractions) // 3)
    elif budget == "medium":
        limit = max(4, len(sorted_attractions) // 2)
    else:
        limit = max(6, len(sorted_attractions))

    return sorted_attractions[:limit]


def cluster_attractions_by_location(attractions: List[dict], num_days: int) -> List[List[dict]]:
    """
    用 K-means 演算法根據地理位置分群景點
    目標：同一天的景點彼此相近，減少跨區移動

    演算法：K-means clustering
    - K = num_days（分成指定天數個群）
    - 特徵：景點的經緯度座標
    - 目標：最小化群內景點之間的地理距離
    """
    if not attractions or len(attractions) <= num_days:
        # 景點太少，直接平均分配
        attractions_per_day = max(1, len(attractions) // num_days)
        daily_plans = [[] for _ in range(num_days)]
        for idx, attr in enumerate(attractions):
            daily_plans[idx % num_days].append(attr)
        return daily_plans

    # 提取座標
    coordinates = np.array([
        [a["location"]["lat"], a["location"]["lng"]]
        for a in attractions
    ])

    # K-means 聚類
    kmeans = KMeans(n_clusters=num_days, random_state=42, n_init=10)
    labels = kmeans.fit_predict(coordinates)

    # 按聚類分組
    clusters = [[] for _ in range(num_days)]
    for idx, label in enumerate(labels):
        clusters[label].append(attractions[idx])

    # 按聚類中心的緯度排序（從北到南）
    cluster_centers = kmeans.cluster_centers_
    sorted_indices = np.argsort(cluster_centers[:, 0])[::-1]

    # 重新排列聚類
    sorted_clusters = [clusters[i] for i in sorted_indices]

    # 在每個聚類內按距離排序（貪婪最近鄰排序）
    daily_plans = []
    for cluster in sorted_clusters:
        sorted_cluster = greedy_nearest_neighbor_order(cluster)
        daily_plans.append(sorted_cluster)

    return daily_plans


def greedy_nearest_neighbor_order(attractions: List[dict]) -> List[dict]:
    """
    貪婪最近鄰演算法：按景點之間的地理距離排序
    從第一個景點開始，每次選擇距離最近的未訪問景點
    計算本地估算交通時間（無 API 呼叫）
    """
    if len(attractions) <= 1:
        return attractions

    # 以評分最高的景點作為起點
    first_attraction = max(attractions, key=lambda x: x.get("rating", 0))
    ordered = [first_attraction]
    remaining = [a for a in attractions if a != first_attraction]

    while remaining:
        last_lat = ordered[-1]["location"]["lat"]
        last_lng = ordered[-1]["location"]["lng"]

        # 找距離最近的景點
        nearest = min(
            remaining,
            key=lambda a: haversine_distance(
                last_lat, last_lng,
                a["location"]["lat"], a["location"]["lng"]
            )
        )

        # 計算距離和交通時間（純本地計算，無 API 呼叫）
        distance = haversine_distance(
            last_lat, last_lng,
            nearest["location"]["lat"], nearest["location"]["lng"]
        )

        # 根據距離自動判斷交通模式：500m內用步行，以上用開車
        mode = "walking" if distance < 500 else "driving"
        travel_time = get_travel_time(
            last_lat, last_lng,
            nearest["location"]["lat"], nearest["location"]["lng"],
            mode=mode
        )

        nearest["distance_to_previous"] = distance
        nearest["travel_time_to_previous"] = travel_time
        nearest["travel_mode"] = mode  # 記錄交通模式用於 reason 文字

        ordered.append(nearest)
        remaining.remove(nearest)

    return ordered


def estimate_travel_time(distance_meters: float, mode: str = "walking") -> int:
    """
    本地估算交通時間（無需呼叫 Google API）
    - walking: 平均時速 4.5 km/h（悠閒漫步）
    - driving: 平均時速 25 km/h（市區開車含紅綠燈延遲）
    """
    if distance_meters <= 0:
        return 1

    speed_kmh = 4.5 if mode == "walking" else 25
    distance_km = distance_meters / 1000
    minutes = (distance_km / speed_kmh) * 60
    return max(1, round(minutes))


def get_travel_time(lat1: float, lng1: float, lat2: float, lng2: float, mode: str = "walking") -> int:
    """
    計算兩點間的旅行時間（現改為本地估算，不呼叫 API）
    先計算 haversine 距離，再用 estimate_travel_time 估算分鐘數
    """
    distance = haversine_distance(lat1, lng1, lat2, lng2)
    return estimate_travel_time(distance, mode)


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    計算兩點之間的地理距離（公尺）
    使用 Haversine 公式
    """
    R = 6371000  # 地球半徑（公尺）

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)

    a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c

def validate_opening_hours(day_schedule: List[dict]) -> List[dict]:
    """
    驗證開放時間，檢查時間衝突
    如果景點的安排時間與營業時間不符，自動調整順序
    """
    if not day_schedule:
        return day_schedule

    # 簡單策略：按開放時間排序
    def get_opening_hour(attr):
        try:
            hours = attr.get("opening_hours")
            if hours and isinstance(hours, OpeningHours):
                return int(hours.open.split(":")[0])
            return 8
        except:
            return 8

    sorted_schedule = sorted(day_schedule, key=get_opening_hour)

    # 添加時間衝突標記（可選）
    for i, attr in enumerate(sorted_schedule):
        attr["opening_hours_valid"] = True

    return sorted_schedule


def balance_daily_intensity(day_schedule: List[dict], max_intensity: int = 10, next_day_schedule: Optional[List[dict]] = None) -> Dict:
    """
    平衡每日體力分配
    - 計算該天的總強度值
    - 如果超過上限，嘗試將弱景點移到下一天
    - 返回包含體力指標的日程資料
    """
    total_intensity = sum(a.get("intensity_score", 3) for a in day_schedule)

    # 如果超過上限，嘗試重新分配
    if total_intensity > max_intensity and next_day_schedule is not None and len(day_schedule) > 1:
        # 找到強度最低且排在最後的景點
        weakest_idx = -1
        weakest_intensity = float('inf')
        for i in range(len(day_schedule) - 1, -1, -1):  # 從後往前找
            intensity = day_schedule[i].get("intensity_score", 3)
            if intensity < weakest_intensity:
                weakest_intensity = intensity
                weakest_idx = i

        # 將該景點移到下一天
        if weakest_idx >= 0:
            moved_attraction = day_schedule.pop(weakest_idx)
            moved_attraction["reason"] = "因體力評估調整至此"
            next_day_schedule.insert(0, moved_attraction)
            total_intensity -= weakest_intensity
            print(f"[體力調整] 將 {moved_attraction.get('name', '')} 從本日移至下一日 (強度: {weakest_intensity})")

    # 生成提示文字
    if total_intensity <= 4:
        intensity_note = "輕鬆"
    elif total_intensity <= 7:
        intensity_note = "中等體力"
    elif total_intensity <= 10:
        intensity_note = "較耗體力"
    else:
        intensity_note = "⚠️ 這天行程較累，建議拆分景點"

    return {
        "schedule": day_schedule,
        "daily_intensity": min(total_intensity, 10),
        "daily_intensity_note": intensity_note,
        "intensity_level": total_intensity
    }

def get_meal_candidates(destination: str, interests: List[str], lat: float, lng: float) -> List[dict]:
    """
    獲取用餐候選餐廳清單

    策略：
    1. 如果使用者選了 "food" 興趣，從既有 attractions 池子中提取 restaurant/cafe
    2. 如果沒選 "food"，額外呼叫 places_nearby（最多 2 次：restaurant + cafe）
    3. 用 vicinity 當地址（無需額外 API）

    回傳：List[dict] 含 name/rating/location/type/vicinity/place_id
    """
    meal_candidates = []

    # 檢查是否已有 food 興趣（可能已有 attractions 中的餐廳）
    has_food = "food" in interests

    if has_food:
        # 從快取中檢查是否已經有餐廳數據
        cache_key_restaurant = f"{destination}:restaurant"
        cache_key_cafe = f"{destination}:cafe"

        if cache_key_restaurant in _attractions_cache:
            meal_candidates.extend(_attractions_cache[cache_key_restaurant])
            print(f"[用餐快取] 從既有 attractions 取得 restaurant")

        if cache_key_cafe in _attractions_cache:
            meal_candidates.extend(_attractions_cache[cache_key_cafe])
            print(f"[用餐快取] 從既有 attractions 取得 cafe")
    else:
        # 沒選 "food" 興趣，額外呼叫 places_nearby 取得餐廳
        print(f"[提示] 使用者未選 'food' 興趣，額外呼叫 places_nearby 取得餐廳")

        for place_type in ["restaurant", "cafe"]:
            try:
                places_result = gmaps.places_nearby(
                    location=(lat, lng),
                    radius=20000,
                    type=place_type
                )

                for place in places_result.get("results", [])[:5]:
                    # 同樣過濾排除清單
                    place_types_list = place.get("types", [])
                    if any(excluded in place_types_list for excluded in EXCLUDED_TYPES):
                        continue

                    loc = place.get("geometry", {}).get("location", {})
                    meal_candidates.append({
                        "name": place.get("name", ""),
                        "rating": place.get("rating", 0),
                        "location": {"lat": loc.get("lat", 0), "lng": loc.get("lng", 0)},
                        "type": place_type,
                        "vicinity": place.get("vicinity", ""),
                        "place_id": place.get("place_id", "")
                    })

                print(f"[用餐 API] places_nearby({place_type}) 回傳 {len(places_result.get('results', []))} 筆")
            except Exception as e:
                print(f"Error fetching meals for {place_type}: {e}")

    return meal_candidates


def calculate_attractions_center(attractions: List[dict]) -> tuple:
    """
    計算一天景點群的地理中心（平均纬經）
    用於後續計算餐廳距離
    """
    if not attractions:
        return (0, 0)

    lats = [a["location"]["lat"] for a in attractions]
    lngs = [a["location"]["lng"] for a in attractions]

    center_lat = sum(lats) / len(lats)
    center_lng = sum(lngs) / len(lngs)

    return (center_lat, center_lng)


def assign_meals_for_day(day_attractions: List[dict], meal_candidates: List[dict], destination: str, used_restaurants: set) -> List[dict]:
    """
    為一天分配早中晚三間餐廳

    邏輯：
    - 早餐：cafe（評分最高、未使用過）
    - 午餐、晚餐：restaurant（距景點群最近、未使用過）
    - 如果餐廳池為空，回退到簡單文字

    回傳：List[dict] 含 time/name/type/rating/address/distance_from_attractions_m
    """
    meals = []

    # 計算該天景點群的地理中心
    attractions_center = calculate_attractions_center(day_attractions)

    # 篩選可用餐廳（未被同一趟行程使用過）
    available_cafes = [m for m in meal_candidates if m.get("type") == "cafe" and m.get("place_id") not in used_restaurants]
    available_restaurants = [m for m in meal_candidates if m.get("type") == "restaurant" and m.get("place_id") not in used_restaurants]

    # ============ 早餐 ============
    if available_cafes:
        breakfast_cafe = max(available_cafes, key=lambda x: x.get("rating", 0))
        used_restaurants.add(breakfast_cafe.get("place_id", ""))

        meals.append({
            "time": "08:00",
            "name": breakfast_cafe.get("name", "當地咖啡館"),
            "type": "breakfast",
            "rating": breakfast_cafe.get("rating", 0),
            "address": breakfast_cafe.get("vicinity", ""),
            "distance_from_attractions_m": None
        })
    else:
        meals.append({
            "time": "08:00",
            "name": f"{destination}當地咖啡",
            "type": "breakfast",
            "rating": 0,
            "address": "",
            "distance_from_attractions_m": None
        })

    # ============ 午餐 ============
    if available_restaurants:
        # 找距景點群最近的餐廳
        lunch_restaurant = min(
            available_restaurants,
            key=lambda x: haversine_distance(
                attractions_center[0], attractions_center[1],
                x["location"]["lat"], x["location"]["lng"]
            )
        )
        used_restaurants.add(lunch_restaurant.get("place_id", ""))

        distance = haversine_distance(
            attractions_center[0], attractions_center[1],
            lunch_restaurant["location"]["lat"], lunch_restaurant["location"]["lng"]
        )

        meals.append({
            "time": "12:30",
            "name": lunch_restaurant.get("name", "在地美食"),
            "type": "lunch",
            "rating": lunch_restaurant.get("rating", 0),
            "address": lunch_restaurant.get("vicinity", ""),
            "distance_from_attractions_m": int(distance)
        })
    else:
        meals.append({
            "time": "12:30",
            "name": f"{destination}在地美食",
            "type": "lunch",
            "rating": 0,
            "address": "",
            "distance_from_attractions_m": None
        })

    # ============ 晚餐 ============
    if available_restaurants:
        # 再篩一次（午餐可能已用掉一間）
        remaining_restaurants = [m for m in meal_candidates if m.get("type") == "restaurant" and m.get("place_id") not in used_restaurants]

        if remaining_restaurants:
            dinner_restaurant = min(
                remaining_restaurants,
                key=lambda x: haversine_distance(
                    attractions_center[0], attractions_center[1],
                    x["location"]["lat"], x["location"]["lng"]
                )
            )
            used_restaurants.add(dinner_restaurant.get("place_id", ""))

            distance = haversine_distance(
                attractions_center[0], attractions_center[1],
                dinner_restaurant["location"]["lat"], dinner_restaurant["location"]["lng"]
            )

            meals.append({
                "time": "18:00",
                "name": dinner_restaurant.get("name", "特色餐廳"),
                "type": "dinner",
                "rating": dinner_restaurant.get("rating", 0),
                "address": dinner_restaurant.get("vicinity", ""),
                "distance_from_attractions_m": int(distance)
            })
        else:
            # 沒有其他餐廳了，回退到簡單文字
            meals.append({
                "time": "18:00",
                "name": f"{destination}特色餐廳",
                "type": "dinner",
                "rating": 0,
                "address": "",
                "distance_from_attractions_m": None
            })
    else:
        meals.append({
            "time": "18:00",
            "name": f"{destination}特色餐廳",
            "type": "dinner",
            "rating": 0,
            "address": "",
            "distance_from_attractions_m": None
        })

    return meals


def add_meals(daily_plans: List[Dict], destination: str, budget: str, interests: List[str], destination_lat: float, destination_lng: float) -> List[DailyItinerary]:
    """
    為每天加上餐廳建議，並生成排序說明

    改進：
    - 使用真實餐廳數據而非硬編碼文字
    - 複用既有 attractions 池（如果有 food 興趣）或額外呼叫 places_nearby（最多 2 次）
    - 智能分配餐廳：早餐選評分最高的 cafe，午餐/晚餐選距景點群最近的 restaurant
    - 整趟行程去重：同一間餐廳不重複推薦
    """
    itinerary = []

    # ===== 前置：一次性獲取餐廳候選清單 =====
    meal_candidates = get_meal_candidates(destination, interests, destination_lat, destination_lng)
    used_restaurants = set()  # 跨天去重

    for day_idx, day_data in enumerate(daily_plans):
        day_attractions = day_data.get("schedule", [])
        daily_intensity = day_data.get("daily_intensity", 0)
        intensity_note = day_data.get("daily_intensity_note", "")

        # 為景點生成排序說明
        attractions_with_reason = []
        for i, attr in enumerate(day_attractions):
            attr_obj = AttractionWithLogic(
                name=attr.get("name", ""),
                location=attr.get("location", {}),
                rating=attr.get("rating", 0),
                opening_hours=attr.get("opening_hours"),
                type=attr.get("type", ""),
                duration_minutes=attr.get("duration_minutes", 60),
                intensity_score=attr.get("intensity_score", 3),
                category=attr.get("category", ""),
                # 詳細信息
                address=attr.get("address"),
                phone_number=attr.get("phone_number"),
                website=attr.get("website"),
                place_id=attr.get("place_id"),
                # 交通信息
                distance_to_previous=attr.get("distance_to_previous"),
                travel_time_to_previous=attr.get("travel_time_to_previous")
            )

            # 生成排序說明
            if i == 0:
                attr_obj.reason = "首個景點，評分最高"
            elif "distance_to_previous" in attr and attr["distance_to_previous"]:
                distance_m = int(attr["distance_to_previous"])
                travel_time = attr.get("travel_time_to_previous", 5)
                travel_mode = attr.get("travel_mode", "walking")

                # 根據交通模式顯示不同的文字
                mode_label = "步行" if travel_mode == "walking" else "車程"

                if distance_m < 500:
                    attr_obj.reason = f"距離上一站 {distance_m}m ({mode_label} ~{travel_time}min)，就近安排"
                elif distance_m < 2000:
                    attr_obj.reason = f"距離上一站 {distance_m // 1000}km ({mode_label} ~{travel_time}min)，同區域景點"
                else:
                    attr_obj.reason = f"距離上一站 {distance_m // 1000}km ({mode_label} ~{travel_time}min)，規劃為下一區域"
            else:
                attr_obj.reason = "根據營業時間安排"

            attractions_with_reason.append(attr_obj)

        # ===== 為這一天分配用餐 =====
        meals = assign_meals_for_day(day_attractions, meal_candidates, destination, used_restaurants)

        itinerary.append(
            DailyItinerary(
                day=day_idx + 1,
                attractions=attractions_with_reason,
                meals=meals,
                daily_intensity=daily_intensity,
                daily_intensity_note=intensity_note
            )
        )

    return itinerary

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
