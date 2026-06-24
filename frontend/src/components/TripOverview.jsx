import { useRef } from 'react'
import './TripOverview.css'

export default function TripOverview({ itinerary, onDayClick }) {
  const scrollContainerRef = useRef(null)

  const handleDayClick = (day) => {
    // 点击该天的卡片
    onDayClick?.(day)

    // 平滑滚动到对应的 day-card
    setTimeout(() => {
      const dayCard = document.getElementById(`day-${day}`)
      if (dayCard) {
        dayCard.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 50)
  }

  const getIntensityColor = (intensity) => {
    // 根据强度返回颜色
    if (intensity <= 3) return '#4ade80' // 绿色（低强度）
    if (intensity <= 6) return '#eab308' // 黄色（中等强度）
    return '#f97316' // 橘红色（高强度）
  }

  const getIntensityLevel = (intensity) => {
    if (intensity <= 3) return '轻松'
    if (intensity <= 6) return '中等'
    return '较耗体力'
  }

  const getAttractionPreview = (attractions) => {
    if (!attractions || attractions.length === 0) return '无景点'

    const names = attractions.slice(0, 2).map(a => a.name)
    const remaining = attractions.length - 2

    if (remaining > 0) {
      return `${names.join('、')}...等 ${attractions.length} 个`
    }
    return names.join('、')
  }

  return (
    <div className="trip-overview">
      <div className="overview-header">
        <h3 className="overview-title">行程总览</h3>
      </div>

      <div className="overview-timeline-container" ref={scrollContainerRef}>
        <div className="overview-timeline">
          {itinerary.map((day) => (
            <div
              key={day.day}
              className="overview-day-block"
              onClick={() => handleDayClick(day.day)}
            >
              {/* 日期标签 */}
              <div className="overview-day-header">
                <span className="overview-day-label">第 {day.day} 天</span>
                <span className="overview-attraction-count">
                  {day.attractions?.length || 0} 个景点
                </span>
              </div>

              {/* 体力强度指示 */}
              <div className="overview-intensity">
                <div
                  className="intensity-bar"
                  style={{
                    height: '40px',
                    background: getIntensityColor(day.daily_intensity),
                    borderRadius: '3px',
                    marginBottom: '6px'
                  }}
                />
                <div className="intensity-info">
                  <span className="intensity-value">{day.daily_intensity}/10</span>
                  <span className="intensity-note">
                    {day.daily_intensity_note || getIntensityLevel(day.daily_intensity)}
                  </span>
                </div>
              </div>

              {/* 景点预览 */}
              <div className="overview-attractions-preview">
                <p className="preview-text">
                  {getAttractionPreview(day.attractions)}
                </p>
              </div>

              {/* 点击提示 */}
              <div className="overview-click-hint">查看详情</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
