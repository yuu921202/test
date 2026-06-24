import { useState, useEffect } from 'react'
import { MapPin, Calendar, DollarSign, Leaf, UtensilsCrossed, BookOpen, ShoppingBag, Users, Palette, X, Wand2 } from 'lucide-react'
import { getSavedTrips, removeTripFromStorage, formatRelativeTime } from '../utils/tripStorage'
import './TripForm.css'

const INTERESTS = [
  { id: 'nature', label: '自然風景', icon: Leaf },
  { id: 'food', label: '美食', icon: UtensilsCrossed },
  { id: 'history', label: '歷史古蹟', icon: BookOpen },
  { id: 'shopping', label: '購物', icon: ShoppingBag },
  { id: 'family', label: '親子', icon: Users },
  { id: 'art', label: '藝術文青', icon: Palette }
]

export default function TripForm({ onSubmit, loading, onLoadSavedTrip }) {
  const [formData, setFormData] = useState({
    destination: '',
    days: 3,
    budget: 'medium',
    interests: []
  })
  const [savedTrips, setSavedTrips] = useState([])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiReasoning, setAiReasoning] = useState('')
  const [aiError, setAiError] = useState('')

  // 加载保存的行程
  useEffect(() => {
    const trips = getSavedTrips()
    setSavedTrips(trips)
  }, [])

  const handleLoadSavedTrip = (tripData) => {
    onLoadSavedTrip?.(tripData)
  }

  const handleDeleteSavedTrip = (tripId, e) => {
    e.stopPropagation() // 防止冒泡到卡片点击事件

    if (window.confirm('确定要删除这个保存的行程吗？')) {
      if (removeTripFromStorage(tripId)) {
        setSavedTrips(savedTrips.filter(trip => trip.id !== tripId))
      }
    }
  }

  const handleDestinationChange = (e) => {
    setFormData({
      ...formData,
      destination: e.target.value
    })
  }

  const handleDaysChange = (e) => {
    setFormData({
      ...formData,
      days: e.target.value
    })
  }

  const handleBudgetChange = (e) => {
    setFormData({
      ...formData,
      budget: e.target.value
    })
  }

  const handleInterestToggle = (id) => {
    const newInterests = formData.interests.includes(id)
      ? formData.interests.filter(i => i !== id)
      : [...formData.interests, id]

    setFormData({
      ...formData,
      interests: newInterests
    })
  }

  const handleAiParsePreference = async () => {
    if (!aiInput.trim()) {
      setAiError('請輸入您的旅行偏好描述')
      return
    }

    setAiLoading(true)
    setAiError('')
    setAiReasoning('')

    try {
      const response = await fetch('http://localhost:8000/parse-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: aiInput
        })
      })

      const result = await response.json()

      if (result.success) {
        // 自动填充表单
        const updatedFormData = {
          ...formData,
          interests: result.interests,
          budget: result.budget
        }

        // 只有当 destination 不为空时，才自动填入
        if (result.destination && result.destination.trim()) {
          updatedFormData.destination = result.destination
        }
        // 如果 destination 为空字串，保持现有的 destination 值不变

        setFormData(updatedFormData)
        setAiReasoning(result.reasoning)
        setAiError('')

        // 如果 AI 成功解析了兴趣标签，自动提交规划
        if (result.interests && result.interests.length > 0) {
          // 延迟 300ms 让 UI 更新完成，再自动提交
          setTimeout(() => {
            // 检查目的地是否有效（来自 AI 或用户之前的输入）
            const destinationToUse = (result.destination && result.destination.trim())
              ? result.destination
              : formData.destination

            if (!destinationToUse.trim()) {
              setAiError('請輸入目的地後才能規劃')
              return
            }

            // 调用规划函数
            onSubmit({
              destination: destinationToUse,
              days: updatedFormData.days,
              budget: updatedFormData.budget,
              interests: updatedFormData.interests
            })
          }, 300)
        }
      } else {
        // AI 解析失败，显示提示
        setAiError(result.reasoning || 'AI 暫時無法理解，請手動選擇偏好')
      }
    } catch (err) {
      console.error('AI 偏好解析失败:', err)
      setAiError('AI 服務暫時不可用，請手動選擇偏好')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.destination.trim()) {
      alert('請輸入目的地')
      return
    }
    if (formData.interests.length === 0) {
      alert('請至少選擇一個興趣')
      return
    }
    onSubmit(formData)
  }

  return (
    <>
      {/* 历史行程区块 */}
      {savedTrips.length > 0 && (
        <div className="saved-trips-section">
          <h3 className="saved-trips-title">最近保存的行程</h3>
          <div className="saved-trips-grid">
            {savedTrips.map(trip => (
              <div
                key={trip.id}
                className="saved-trip-card"
                onClick={() => handleLoadSavedTrip(trip.tripData)}
              >
                <button
                  className="delete-trip-btn"
                  onClick={(e) => handleDeleteSavedTrip(trip.id, e)}
                  title="删除此行程"
                  aria-label="删除"
                >
                  <X size={16} />
                </button>
                <div className="trip-card-content">
                  <div className="trip-destination">{trip.tripData.destination}</div>
                  <div className="trip-meta">
                    <span className="trip-days">{trip.tripData.days} 天</span>
                    <span className="trip-time">{formatRelativeTime(trip.savedAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI 智能输入框 */}
      <div className="ai-preference-section">
        <div className="ai-input-wrapper">
          <div className="ai-input-group">
            <input
              type="text"
              className="ai-input"
              placeholder="試試看：我想悠閒一點，喜歡拍美照跟逛博物館，不要太累"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              disabled={aiLoading}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !aiLoading) {
                  handleAiParsePreference()
                }
              }}
            />
            <button
              type="button"
              className="ai-parse-btn"
              onClick={handleAiParsePreference}
              disabled={aiLoading}
            >
              <Wand2 size={16} />
              {aiLoading ? 'AI 分析中...' : 'AI 幫我選'}
            </button>
          </div>

          {/* AI 推理说明 */}
          {aiReasoning && (
            <div className="ai-reasoning">
              <span className="reasoning-label">💡 AI 判断：</span>
              <span className="reasoning-text">{aiReasoning}</span>
            </div>
          )}

          {/* AI 错误提示 */}
          {aiError && (
            <div className="ai-error">
              {aiError}
            </div>
          )}
        </div>
      </div>

      <form className="trip-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="destination">
          <MapPin size={16} />
          目的地
        </label>
        <input
          id="destination"
          type="text"
          placeholder="如：東京、巴黎、首爾"
          value={formData.destination}
          onChange={handleDestinationChange}
          disabled={loading}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="days">
            <Calendar size={16} />
            天數
          </label>
          <select id="days" value={formData.days} onChange={handleDaysChange} disabled={loading}>
            {[1, 2, 3, 4, 5, 7, 10].map(d => (
              <option key={d} value={d}>{d} 天</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="budget">
            <DollarSign size={16} />
            預算
          </label>
          <select id="budget" value={formData.budget} onChange={handleBudgetChange} disabled={loading}>
            <option value="low">經濟型</option>
            <option value="medium">標準型</option>
            <option value="high">豪華型</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>興趣偏好</label>
        <div className="interests-grid">
          {INTERESTS.map(interest => {
            const IconComponent = interest.icon
            return (
              <label key={interest.id} className="interest-checkbox">
                <input
                  type="checkbox"
                  checked={formData.interests.includes(interest.id)}
                  onChange={() => handleInterestToggle(interest.id)}
                  disabled={loading}
                />
                <IconComponent size={16} className="interest-icon" />
                <span>{interest.label}</span>
              </label>
            )
          })}
        </div>
      </div>

      <button type="submit" disabled={loading} className="submit-btn">
        {loading ? '生成中...' : '開始規劃'}
      </button>
    </form>
    </>
  )
}
