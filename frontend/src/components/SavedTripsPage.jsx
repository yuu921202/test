import { useState, useEffect } from 'react'
import { Trash2, Play, Calendar, MapPin, Clock } from 'lucide-react'
import { getSavedTrips, removeTripFromStorage, formatRelativeTime } from '../utils/tripStorage'
import './SavedTripsPage.css'

export default function SavedTripsPage({ onLoadTrip }) {
  const [savedTrips, setSavedTrips] = useState([])
  const [searchDestination, setSearchDestination] = useState('')

  // 初始化加载已保存的行程
  useEffect(() => {
    const trips = getSavedTrips()
    setSavedTrips(trips)
  }, [])

  const handleLoadTrip = (tripData) => {
    onLoadTrip?.(tripData)
  }

  const handleDeleteTrip = (tripId, e) => {
    e.stopPropagation()

    if (window.confirm('确定要删除这个行程吗？')) {
      if (removeTripFromStorage(tripId)) {
        setSavedTrips(savedTrips.filter(trip => trip.id !== tripId))
      }
    }
  }

  // 搜索过滤
  const filteredTrips = savedTrips.filter(trip =>
    trip.tripData.destination.toLowerCase().includes(searchDestination.toLowerCase())
  )

  const getBudgetLabel = (budget) => {
    const labels = {
      low: '經濟型',
      medium: '標準型',
      high: '豪華型'
    }
    return labels[budget] || '標準型'
  }

  return (
    <div className="saved-trips-page">
      <div className="page-header">
        <h2 className="page-title">已收藏的行程</h2>
        <p className="page-subtitle">
          {savedTrips.length === 0 ? '暫無收藏的行程' : `共 ${savedTrips.length} / 10 筆`}
        </p>
      </div>

      {savedTrips.length > 0 && (
        <div className="search-section">
          <input
            type="text"
            placeholder="搜尋目的地..."
            value={searchDestination}
            onChange={(e) => setSearchDestination(e.target.value)}
            className="search-input"
          />
        </div>
      )}

      <div className="trips-container">
        {filteredTrips.length > 0 ? (
          <div className="trips-grid">
            {filteredTrips.map((trip) => (
              <div
                key={trip.id}
                className="trip-card"
                onClick={() => handleLoadTrip(trip.tripData)}
              >
                {/* 刪除按鈕 */}
                <button
                  className="delete-btn"
                  onClick={(e) => handleDeleteTrip(trip.id, e)}
                  title="刪除此行程"
                >
                  <Trash2 size={16} />
                </button>

                {/* 卡片內容 */}
                <div className="card-content">
                  <div className="card-header">
                    <h3 className="destination-name">{trip.tripData.destination}</h3>
                    <div className="card-meta">
                      <span className="meta-item">
                        <Calendar size={14} />
                        {trip.tripData.days} 天
                      </span>
                      <span className="meta-item">
                        <MapPin size={14} />
                        {trip.tripData.interests?.length || 0} 个兴趣
                      </span>
                    </div>
                  </div>

                  {/* 行程詳情 */}
                  <div className="trip-details">
                    <div className="detail-row">
                      <span className="detail-label">預算：</span>
                      <span className="detail-value">{getBudgetLabel(trip.tripData.budget)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">景點數：</span>
                      <span className="detail-value">
                        {trip.tripData.itinerary?.reduce((sum, day) => sum + (day.attractions?.length || 0), 0) || 0} 個
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">總體力：</span>
                      <span className="detail-value">
                        {trip.tripData.itinerary?.reduce((sum, day) => sum + day.daily_intensity, 0) || 0} / {(trip.tripData.days || 0) * 10}
                      </span>
                    </div>
                  </div>

                  {/* 保存時間 */}
                  <div className="card-footer">
                    <span className="save-time">
                      <Clock size={12} />
                      保存於 {formatRelativeTime(trip.savedAt)}
                    </span>
                  </div>

                  {/* 加載按鈕 */}
                  <button className="load-btn">
                    <Play size={14} />
                    查看行程
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            {searchDestination ? (
              <>
                <p className="empty-icon">🔍</p>
                <p className="empty-text">找不到符合「{searchDestination}」的行程</p>
              </>
            ) : (
              <>
                <p className="empty-icon">📝</p>
                <p className="empty-text">暫無收藏的行程</p>
                <p className="empty-hint">在行程詳情頁點擊「收藏」按鈕來保存行程</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
