import { useState } from 'react'
import { MapPin, Copy, Home } from 'lucide-react'
import TripOverview from './TripOverview'
import './SharedTripView.css'

const ATTRACTION_TYPES = {
  restaurant: { label: 'Restaurant', icon: MapPin },
  cafe: { label: 'Café', icon: MapPin },
  museum: { label: 'Museum', icon: MapPin },
  park: { label: 'Park', icon: MapPin },
  temple: { label: 'Temple', icon: MapPin },
  shopping_mall: { label: 'Shopping', icon: MapPin },
  amusement_park: { label: 'Amusement', icon: MapPin },
  zoo: { label: 'Zoo', icon: MapPin },
  natural_feature: { label: 'Nature', icon: MapPin },
  art_gallery: { label: 'Gallery', icon: MapPin },
  historical: { label: 'Historical', icon: MapPin },
}

export default function SharedTripView({ tripData, onBackToHome, sharedBy = 'OOO' }) {
  const [expandedDays, setExpandedDays] = useState(new Set(tripData?.itinerary?.map(d => d.day) || []))
  const [copied, setCopied] = useState(false)

  if (!tripData) {
    return (
      <div className="shared-trip-view">
        <div className="error-container">
          <p className="error-icon">⚠️</p>
          <h2 className="error-title">连结无效或已损毁</h2>
          <p className="error-message">无法加载分享的行程</p>
          <button className="back-home-btn" onClick={onBackToHome}>
            <Home size={18} />
            返回首页
          </button>
        </div>
      </div>
    )
  }

  const toggleDay = (day) => {
    const newSet = new Set(expandedDays)
    if (newSet.has(day)) {
      newSet.delete(day)
    } else {
      newSet.add(day)
    }
    setExpandedDays(newSet)
  }

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert('复制失败，请手动复制网址')
    }
  }

  const getBudgetLabel = (budget) => {
    const labels = {
      low: '經濟型',
      medium: '標準型',
      high: '豪華型'
    }
    return labels[budget] || '標準型'
  }

  const getMealIcon = (type) => {
    switch (type) {
      case 'breakfast':
        return '☕'
      case 'lunch':
        return '🍽️'
      case 'dinner':
        return '🌙'
      default:
        return '🍴'
    }
  }

  const getMealLabel = (type) => {
    switch (type) {
      case 'breakfast':
        return '早餐'
      case 'lunch':
        return '午餐'
      case 'dinner':
        return '晚餐'
      default:
        return '用餐'
    }
  }

  return (
    <div className="shared-trip-view">
      {/* 分享信息条 */}
      <div className="share-banner">
        <div className="banner-content">
          <span className="banner-text">这是 <strong>{sharedBy}</strong> 分享给你的行程（唯读检视）</span>
          <button className="back-home-btn-small" onClick={onBackToHome} title="返回首页">
            <Home size={16} />
            我也要规划自己的行程
          </button>
        </div>
        <button
          className={`copy-link-btn ${copied ? 'copied' : ''}`}
          onClick={copyShareLink}
          title="复制分享连结"
        >
          <Copy size={16} />
          {copied ? '已复制' : '分享'}
        </button>
      </div>

      {/* 主容器 */}
      <div className="shared-content">
        {/* 标题 */}
        <div className="shared-header">
          <h1 className="destination-title">{tripData.destination}</h1>
          <div className="header-meta">
            <span className="meta-item">
              <MapPin size={14} />
              {tripData.days} 天
            </span>
            <span className="meta-item">{getBudgetLabel(tripData.budget)}</span>
          </div>
        </div>

        {/* 行程总览 */}
        <TripOverview
          itinerary={tripData.itinerary}
          onDayClick={toggleDay}
        />

        {/* 每日行程 */}
        <div className="itinerary-container">
          {tripData.itinerary.map((day) => (
            <div key={day.day} id={`day-${day.day}`} className="day-card">
              <button
                className="day-header"
                onClick={() => toggleDay(day.day)}
              >
                <div className="day-title">
                  <span className="day-badge">第 {day.day} 天</span>
                  <span>{day.attractions?.length || 0} 个景点</span>
                </div>
                <span className={`chevron ${expandedDays.has(day.day) ? 'expanded' : ''}`}>
                  ▼
                </span>
              </button>

              {expandedDays.has(day.day) && (
                <div className="day-content">
                  {/* 体力指标 */}
                  {day.daily_intensity_note && (
                    <div className={`intensity-bar intensity-${Math.min(day.daily_intensity, 10)}`}>
                      <div className="intensity-info">
                        <span className="intensity-label">这天体力强度</span>
                        <span className="intensity-value">{day.daily_intensity}/10</span>
                      </div>
                      <span className="intensity-note">{day.daily_intensity_note}</span>
                    </div>
                  )}

                  {/* 景点列表 */}
                  {day.attractions && day.attractions.length > 0 && (
                    <div className="attractions-section">
                      <h4>景点安排</h4>
                      <div className="attractions-list">
                        {day.attractions.map((attr, idx) => (
                          <div key={idx} className="attraction-item">
                            <div className="attraction-index">{idx + 1}</div>
                            <div className="attraction-details">
                              <div className="attraction-name">{attr.name}</div>
                              <div className="attraction-meta">
                                <span className="meta-badge">
                                  ⭐ {attr.rating.toFixed(1)}
                                </span>
                                <span className="meta-badge">
                                  ⏱ {attr.duration_minutes} 分
                                </span>
                                <span className="meta-badge">
                                  💪 强度 {attr.intensity_score}/5
                                </span>
                              </div>
                              {attr.reason && (
                                <div className="arrangement-reason">
                                  <span className="reason-label">排序依据：</span>
                                  <span className="reason-text">{attr.reason}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 用餐 */}
                  {day.meals && day.meals.length > 0 && (
                    <div className="meals-section">
                      <h4>用餐</h4>
                      <div className="meals-list">
                        {day.meals.map((meal, idx) => (
                          <div key={idx} className="meal-item">
                            <div className="meal-time">{meal.time}</div>
                            <span className="meal-icon">{getMealIcon(meal.type)}</span>
                            <div className="meal-info">
                              <div className="meal-type">{getMealLabel(meal.type)}</div>
                              <div className="meal-name">{meal.name}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
