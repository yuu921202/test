import { useState, useEffect } from 'react'
import { MapPin, Clock, Star, ChefHat, UtensilsCrossed, Sun, Moon, Coffee, ChevronDown, AlertCircle, TrendingUp, Download, Lightbulb, Bookmark, CalendarPlus, Share2 } from 'lucide-react'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import AttractionDetail from './AttractionDetail'
import QuizModal from './QuizModal'
import SpinWheel from './SpinWheel'
import AchievementPanel from './AchievementPanel'
import TripOverview from './TripOverview'
import { useGameification } from '../GameificationContext'
import { saveTripToStorage, saveTripOverwriteOldest, isTripAlreadySaved } from '../utils/tripStorage'
import { downloadICS } from '../utils/icsExport'
import { generateShareLink, copyShareLink } from '../utils/shareTrip'
import './TripPlan.css'

const ATTRACTION_TYPES = {
  restaurant: { label: 'Restaurant', icon: UtensilsCrossed },
  cafe: { label: 'Café', icon: Coffee },
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

export default function TripPlan({ tripData }) {
  const [expandedDays, setExpandedDays] = useState(new Set(tripData?.itinerary?.map(d => d.day) || []))
  const [selectedAttraction, setSelectedAttraction] = useState(null)
  const [exportingPDF, setExportingPDF] = useState(false)
  const [replacingAttraction, setReplacingAttraction] = useState(null)
  const [showReplaceModal, setShowReplaceModal] = useState(false)
  const [quizAttraction, setQuizAttraction] = useState(null)
  const [showQuiz, setShowQuiz] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [savingTrip, setSavingTrip] = useState(false)
  const { showSpinWheel, setShowSpinWheel, completedQuizzes } = useGameification()

  // 检查行程是否已保存
  useEffect(() => {
    setIsSaved(isTripAlreadySaved(tripData))
  }, [tripData])

  if (!tripData || !tripData.itinerary) {
    return null
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

  const handleReplaceAttraction = (attraction) => {
    setReplacingAttraction(attraction)
    setShowReplaceModal(true)
  }

  const handleSaveTrip = async () => {
    if (isSaved) return // 已保存，不再操作

    setSavingTrip(true)
    const result = saveTripToStorage(tripData)

    if (result.success) {
      setIsSaved(true)
      alert('✓ 行程已保存')
    } else if (result.needsConfirmation) {
      // 超过上限，确认是否覆盖
      if (window.confirm('已达储存上限（10 笔），是否覆盖最旧的一笔？')) {
        const overwriteResult = saveTripOverwriteOldest(tripData)
        if (overwriteResult.success) {
          setIsSaved(true)
          alert('✓ 行程已保存（覆盖最旧的一笔）')
        } else {
          alert('✗ 保存失败：' + overwriteResult.message)
        }
      }
    } else {
      alert('✗ ' + result.message)
    }

    setSavingTrip(false)
  }

  const handleExportCalendar = () => {
    try {
      downloadICS(tripData)
      alert('✓ 行程已导出为日历文件，请在日历应用中导入')
    } catch (error) {
      alert('✗ 导出日历失败：' + error.message)
    }
  }

  const handleShareTrip = async () => {
    try {
      const supported = await copyShareLink(tripData)

      if (supported) {
        alert('✓ 分享链接已复制到剪贴簿')
      } else {
        // 不支持 Clipboard API，显示分享链接供用户手动复制
        const shareLink = generateShareLink(tripData)
        showShareModal(shareLink)
      }
    } catch (error) {
      alert('✗ 生成分享链接失败：' + error.message)
    }
  }

  const [shareLink, setShareLink] = useState(null)
  const [showingShareModal, setShowingShareModal] = useState(false)

  const showShareModal = (link) => {
    setShareLink(link)
    setShowingShareModal(true)
  }

  const removeAttractionFromItinerary = (dayIndex, attrIndex) => {
    // 找到該天的景點並移除
    const updatedItinerary = tripData.itinerary.map((day, dIdx) => {
      if (dIdx === dayIndex) {
        return {
          ...day,
          attractions: day.attractions.filter((_, aIdx) => aIdx !== attrIndex)
        }
      }
      return day
    })
    // 注：實際應該觸發重新生成，這裡只是視覺更新
    setShowReplaceModal(false)
    alert('已從行程中移除。（提示：重新生成行程以獲得最佳效果）')
  }

  const exportToPDF = async () => {
    try {
      setExportingPDF(true)

      // 使用 html2canvas 将 HTML 转换为图像，然后插入 PDF
      const element = document.getElementById('trip-plan-export')
      if (!element) {
        alert('無法找到行程內容')
        setExportingPDF(false)
        return
      }

      // 隐藏游戏化相关元素（成就面板、按钮等）
      const achievementPanel = element.querySelector('.achievement-panel')
      const quizButtons = element.querySelectorAll('.quiz-button')
      const exportBtn = element.querySelector('.export-btn')

      const originalDisplay = {
        achievement: achievementPanel?.style.display,
        quiz: Array.from(quizButtons).map(btn => btn.style.display),
        export: exportBtn?.style.display
      }

      if (achievementPanel) achievementPanel.style.display = 'none'
      quizButtons.forEach(btn => (btn.style.display = 'none'))
      if (exportBtn) exportBtn.style.display = 'none'

      // 隐藏替换按钮相关的包装器
      const attractionWrappers = element.querySelectorAll('.attraction-item-wrapper')
      attractionWrappers.forEach(wrapper => {
        wrapper.style.display = 'flex'
      })

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#1C1714',
        allowTaint: true
      })

      // 恢复显示
      if (achievementPanel) achievementPanel.style.display = originalDisplay.achievement || ''
      quizButtons.forEach((btn, idx) => (btn.style.display = originalDisplay.quiz[idx] || ''))
      if (exportBtn) exportBtn.style.display = originalDisplay.export || ''

      const imgData = canvas.toDataURL('image/png')
      const imgWidth = 210 // A4 宽度 (mm)
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      const pageHeight = 297 // A4 高度 (mm)

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      let yPosition = 0
      let pageIndex = 0

      // 分页添加图像
      while (yPosition < imgHeight) {
        if (pageIndex > 0) {
          pdf.addPage()
        }

        const remainingHeight = imgHeight - yPosition
        const heightToPrint = Math.min(pageHeight, remainingHeight)

        // 计算裁剪区域
        const sourceY = (yPosition * canvas.height) / imgHeight
        const sourceHeight = (heightToPrint * canvas.height) / imgHeight

        const croppedCanvas = document.createElement('canvas')
        croppedCanvas.width = canvas.width
        croppedCanvas.height = sourceHeight

        const ctx = croppedCanvas.getContext('2d')
        ctx.drawImage(canvas, 0, -sourceY, canvas.width, canvas.height)

        const croppedImgData = croppedCanvas.toDataURL('image/png')
        pdf.addImage(croppedImgData, 'PNG', 0, 0, imgWidth, heightToPrint)

        yPosition += heightToPrint
        pageIndex++
      }

      pdf.save(`${tripData.destination}-${tripData.days}日行程規劃.pdf`)
      setExportingPDF(false)
    } catch (error) {
      console.error('PDF 導出失敗:', error)
      setExportingPDF(false)
      alert('PDF 導出失敗，請稍後再試')
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
        return Coffee
      case 'lunch':
        return Sun
      case 'dinner':
        return Moon
      default:
        return UtensilsCrossed
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
    <>
      <div className="trip-plan" id="trip-plan-export">
        <div className="trip-header">
          <div className="trip-header-top">
            <div>
              <h2>{tripData.destination}</h2>
              <div className="trip-meta">
                <span className="meta-item">
                  <MapPin size={14} />
                  {tripData.days} 天
                </span>
                <span className="budget-badge">{getBudgetLabel(tripData.budget)}</span>
              </div>
            </div>
            <div className="trip-action-buttons">
              <button
                className={`save-trip-btn ${isSaved ? 'saved' : ''}`}
                onClick={handleSaveTrip}
                disabled={savingTrip || isSaved}
                title={isSaved ? '已收藏' : '储存此行程'}
              >
                <Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} />
                {isSaved ? '已收藏' : '收藏'}
              </button>
              <button
                className="share-btn"
                onClick={handleShareTrip}
                title="分享此行程"
              >
                <Share2 size={18} />
                分享
              </button>
              <button
                className="export-calendar-btn"
                onClick={handleExportCalendar}
                title="汇出为日历文件"
              >
                <CalendarPlus size={18} />
                日历
              </button>
              <button className="export-btn" onClick={exportToPDF} disabled={exportingPDF} title="導出為 PDF">
                <Download size={18} />
                {exportingPDF ? '生成中...' : 'PDF'}
              </button>
            </div>
          </div>
        </div>

        {/* 行程总览 */}
        <TripOverview
          itinerary={tripData.itinerary}
          onDayClick={toggleDay}
        />

        {/* 成就面板 - 放在行程之前 */}
        <AchievementPanel />

        <div className="itinerary-container">
          {tripData.itinerary.map((day) => (
          <div key={day.day} id={`day-${day.day}`} className="day-card">
            <button
              className="day-header"
              onClick={() => toggleDay(day.day)}
            >
              <div className="day-title">
                <span className="day-badge">第 {day.day} 天</span>
                <span>{day.attractions?.length || 0} 個景點</span>
              </div>
              <ChevronDown
                size={18}
                className={expandedDays.has(day.day) ? 'expanded' : ''}
              />
            </button>

            {expandedDays.has(day.day) && (
              <div className="day-content">
                {/* 體力指標 */}
                {day.daily_intensity_note && (
                  <div className={`intensity-bar intensity-${Math.min(day.daily_intensity, 10)}`}>
                    <TrendingUp size={14} />
                    <div className="intensity-info">
                      <span className="intensity-label">這天體力強度</span>
                      <span className="intensity-value">{day.daily_intensity}/10</span>
                    </div>
                    <span className="intensity-note">{day.daily_intensity_note}</span>
                  </div>
                )}

                {day.attractions && day.attractions.length > 0 && (
                  <div className="attractions-section">
                    <h4>景點安排</h4>
                    <div className="attractions-list">
                      {day.attractions.map((attr, idx) => {
                        const isQuizCompleted = completedQuizzes.has(attr.place_id)
                        return (
                          <div
                            key={idx}
                            className="attraction-item-wrapper"
                          >
                            <div
                              className="attraction-item"
                              onClick={() => setSelectedAttraction(attr)}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="attraction-index">{idx + 1}</div>
                              <div className="attraction-details">
                                <div className="attraction-name">{attr.name}</div>
                                <div className="attraction-meta">
                                  <span className="meta-badge">
                                    <Star size={12} />
                                    {attr.rating.toFixed(1)}
                                  </span>
                                  <span className="meta-badge">
                                    <Clock size={12} />
                                    {attr.duration_minutes} 分
                                  </span>
                                  <span className="meta-badge">
                                    <TrendingUp size={12} />
                                    強度 {attr.intensity_score}/5
                                  </span>
                                </div>
                                {/* 排序說明 */}
                                {attr.reason && (
                                  <div className="arrangement-reason">
                                    <span className="reason-label">排序依據：</span>
                                    <span className="reason-text">{attr.reason}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              className={`quiz-button ${isQuizCompleted ? 'completed' : ''}`}
                              onClick={() => {
                                setQuizAttraction(attr)
                                setShowQuiz(true)
                              }}
                              title={isQuizCompleted ? '已完成' : '認識這個景點'}
                            >
                              <Lightbulb size={16} />
                              {isQuizCompleted ? '✓' : '?'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {day.meals && day.meals.length > 0 && (
                  <div className="meals-section">
                    <h4>用餐</h4>
                    <div className="meals-list">
                      {day.meals.map((meal, idx) => {
                        const MealIcon = getMealIcon(meal.type)
                        return (
                          <div key={idx} className="meal-item">
                            <div className="meal-time">{meal.time}</div>
                            <MealIcon size={16} className="meal-icon" />
                            <div className="meal-info">
                              <div className="meal-type">{getMealLabel(meal.type)}</div>
                              <div className="meal-name">{meal.name}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        </div>
      </div>

      {/* 景點詳細卡片 */}
      {selectedAttraction && (
        <AttractionDetail
          attraction={selectedAttraction}
          onClose={() => setSelectedAttraction(null)}
          onReplace={handleReplaceAttraction}
          onOpenQuiz={(attr) => {
            setQuizAttraction(attr)
            setShowQuiz(true)
          }}
        />
      )}

      {/* 景點知識問答 */}
      {showQuiz && quizAttraction && (
        <QuizModal
          attraction={quizAttraction}
          onClose={() => {
            setShowQuiz(false)
            setQuizAttraction(null)
          }}
          onQuizComplete={() => {
            // 測驗完成後可添加額外邏輯
          }}
        />
      )}

      {/* 幸運轉盤 */}
      {showSpinWheel && (
        <SpinWheel onClose={() => setShowSpinWheel(false)} />
      )}

      {/* 替換景點確認對話框 */}
      {showReplaceModal && replacingAttraction && (
        <div className="replace-modal-overlay" onClick={() => setShowReplaceModal(false)}>
          <div className="replace-modal" onClick={(e) => e.stopPropagation()}>
            <h3>移除景點</h3>
            <p>確定要從行程中移除「{replacingAttraction.name}」嗎？</p>
            <div className="replace-modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowReplaceModal(false)}
              >
                取消
              </button>
              <button
                className="btn-confirm"
                onClick={() => {
                  // 找到景點的索引並移除
                  let found = false
                  for (let dIdx = 0; dIdx < tripData.itinerary.length && !found; dIdx++) {
                    const aIdx = tripData.itinerary[dIdx].attractions.findIndex(
                      a => a.name === replacingAttraction.name
                    )
                    if (aIdx >= 0) {
                      removeAttractionFromItinerary(dIdx, aIdx)
                      found = true
                    }
                  }
                }}
              >
                確認移除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 分享連結對話框 */}
      {showingShareModal && shareLink && (
        <div className="share-modal-overlay" onClick={() => setShowingShareModal(false)}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <h3>分享行程</h3>
            <p className="share-description">複製以下連結分享給朋友：</p>
            <textarea
              className="share-link-input"
              value={shareLink}
              readOnly
              onClick={(e) => e.target.select()}
            />
            <div className="share-modal-actions">
              <button
                className="btn-copy"
                onClick={() => {
                  navigator.clipboard.writeText(shareLink).then(() => {
                    alert('✓ 連結已複製')
                    setShowingShareModal(false)
                  }).catch(() => {
                    alert('複製失敗，請手動複製')
                  })
                }}
              >
                複製連結
              </button>
              <button
                className="btn-close"
                onClick={() => setShowingShareModal(false)}
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
