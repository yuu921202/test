import { useState, useEffect } from 'react'
import { X, MapPin, Phone, Globe, Star, Clock, Navigation, MessageSquare, ThumbsDown, Loader, Lightbulb } from 'lucide-react'
import { useGameification } from '../GameificationContext'
import './AttractionDetail.css'

export default function AttractionDetail({ attraction, onClose, onReplace, onOpenQuiz }) {
  const [details, setDetails] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const { completedQuizzes } = useGameification()

  if (!attraction) return null

  // 打開卡片時異步獲取詳細信息
  useEffect(() => {
    if (attraction.place_id) {
      setLoadingDetails(true)
      fetch(`http://localhost:8000/place-details/${attraction.place_id}`)
        .then(res => res.json())
        .then(data => {
          setDetails(data)
          setLoadingDetails(false)
        })
        .catch(err => {
          console.error('無法獲取景點詳情:', err)
          setLoadingDetails(false)
        })
    }
  }, [attraction.place_id])

  const formatDistance = (meters) => {
    if (!meters) return '距離未知'
    if (meters < 1000) return `${Math.round(meters)}m`
    return `${(meters / 1000).toFixed(1)}km`
  }

  // 從 API 或本地數據取得評論
  const reviews = details?.reviews?.slice(0, 3) || [
    { author: '訪客 A', rating: 5, text: '非常值得參觀，收藏豐富，工作人員友善' },
    { author: '訪客 B', rating: 4, text: '環境優美，展覽品質不錯，但有點擁擠' },
    { author: '訪客 C', rating: 5, text: '藝術作品令人印象深刻，強烈推薦！' }
  ]

  const phone = details?.phone_number || attraction.phone_number
  const website = details?.website || attraction.website
  const address = details?.address || attraction.address

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* 關閉按鈕 */}
        <button className="modal-close" onClick={onClose} aria-label="關閉">
          <X size={24} />
        </button>

        {/* 景點標題 */}
        <div className="detail-header">
          <div className="detail-title-section">
            <h2 className="detail-name">{attraction.name}</h2>
            <div className="detail-meta">
              <span className="rating">
                <Star size={14} fill="currentColor" />
                {attraction.rating.toFixed(1)}
              </span>
              <span className="category">{attraction.type}</span>
              <span className="intensity-badge">
                強度 {attraction.intensity_score}/5
              </span>
            </div>
          </div>
        </div>

        {/* 詳細信息 */}
        <div className="detail-body">
          {/* 地址 */}
          {address && (
            <div className="detail-item">
              <div className="detail-icon">
                <MapPin size={16} />
              </div>
              <div className="detail-content">
                <div className="detail-label">地址</div>
                <div className="detail-value">{address}</div>
              </div>
            </div>
          )}

          {/* 電話 */}
          {phone ? (
            <div className="detail-item">
              <div className="detail-icon">
                <Phone size={16} />
              </div>
              <div className="detail-content">
                <div className="detail-label">電話</div>
                <a href={`tel:${phone}`} className="detail-link">
                  {phone}
                </a>
              </div>
            </div>
          ) : loadingDetails ? (
            <div className="detail-item">
              <div className="detail-icon">
                <Loader size={16} className="loading-spinner" />
              </div>
              <div className="detail-content">
                <div className="detail-label">電話</div>
                <div className="detail-value">加載中...</div>
              </div>
            </div>
          ) : null}

          {/* 網站 */}
          {website ? (
            <div className="detail-item">
              <div className="detail-icon">
                <Globe size={16} />
              </div>
              <div className="detail-content">
                <div className="detail-label">網站</div>
                <a href={website} target="_blank" rel="noopener noreferrer" className="detail-link">
                  造訪官方網站 ↗
                </a>
              </div>
            </div>
          ) : null}

          {/* 營業時間 */}
          {attraction.opening_hours && (
            <div className="detail-item">
              <div className="detail-icon">
                <Clock size={16} />
              </div>
              <div className="detail-content">
                <div className="detail-label">營業時間</div>
                <div className="detail-value">
                  {attraction.opening_hours.open} - {attraction.opening_hours.close}
                </div>
              </div>
            </div>
          )}

          {/* 停留時間 */}
          <div className="detail-item">
            <div className="detail-icon">
              <Clock size={16} />
            </div>
            <div className="detail-content">
              <div className="detail-label">建議停留</div>
              <div className="detail-value">{attraction.duration_minutes} 分鐘</div>
            </div>
          </div>

          {/* 距離和交通時間 */}
          {attraction.travel_time_to_previous && (
            <div className="detail-item">
              <div className="detail-icon">
                <Navigation size={16} />
              </div>
              <div className="detail-content">
                <div className="detail-label">距離上一站</div>
                <div className="detail-value">
                  {formatDistance(attraction.distance_to_previous)}
                  {` · 車程約 ${attraction.travel_time_to_previous} 分鐘`}
                </div>
              </div>
            </div>
          )}

          {/* 排序說明 */}
          {attraction.reason && (
            <div className="detail-reason">
              <div className="reason-label">排序依據</div>
              <div className="reason-text">{attraction.reason}</div>
            </div>
          )}

          {/* 用戶評論 */}
          <div className="detail-reviews">
            <div className="reviews-header">
              <MessageSquare size={14} />
              <span className="reviews-label">用戶評論</span>
            </div>
            <div className="reviews-list">
              {reviews.map((review, idx) => (
                <div key={idx} className="review-card">
                  <div className="review-head">
                    <span className="review-author">{review.author}</span>
                    <div className="review-stars">
                      {'★'.repeat(review.rating)}
                      {'☆'.repeat(5 - review.rating)}
                    </div>
                  </div>
                  <div className="review-text">{review.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 底部操作按鈕 */}
        <div className="detail-footer">
          <button
            className="action-btn quiz-btn"
            onClick={() => {
              onOpenQuiz?.(attraction)
              onClose()
            }}
            title="回答問題獲得積分"
          >
            <Lightbulb size={16} />
            {completedQuizzes.has(attraction.place_id) ? '已完成測驗' : '認識景點'}
          </button>
          <button
            className="action-btn replace-btn"
            onClick={() => {
              onReplace(attraction)
              onClose()
            }}
            title="不喜歡？替換成其他同類型景點"
          >
            <ThumbsDown size={16} />
            不想去
          </button>
        </div>
      </div>
    </div>
  )
}
