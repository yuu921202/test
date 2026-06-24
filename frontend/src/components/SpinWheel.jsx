import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { useGameification } from '../GameificationContext'
import './SpinWheel.css'

export default function SpinWheel({ onClose }) {
  const {
    spinWheel,
    lastWheelResult,
    setLastWheelResult,
    generateWheelItems,
    points,
    allBadges
  } = useGameification()

  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const wheelRef = useRef(null)

  const wheelItems = generateWheelItems()
  const itemAngle = 360 / wheelItems.length

  // 处理转盘旋转
  const handleSpin = () => {
    if (isSpinning || points < 30) return

    setIsSpinning(true)
    setLastWheelResult(null)

    // 计算目标角度（随机选择）
    const spins = 5 // 转5圈
    const randomOffset = Math.random() * 360
    const targetRotation = spins * 360 + randomOffset

    setRotation(targetRotation)

    // 模拟旋转动画时间（3秒）
    setTimeout(() => {
      setIsSpinning(false)

      // 获取奖项
      const result = spinWheel()
      setLastWheelResult(result)
    }, 3000)
  }

  const getBadgeInfo = (badgeId) => {
    return allBadges.find(b => b.id === badgeId)
  }

  return (
    <div className="spin-wheel-overlay" onClick={onClose}>
      <div className="spin-wheel-modal" onClick={(e) => e.stopPropagation()}>
        {/* 关闭按钮 */}
        <button className="spin-close" onClick={onClose} aria-label="關閉">
          <X size={24} />
        </button>

        {/* 标题 */}
        <div className="spin-header">
          <h3>幸運轉盤</h3>
          <p className="spin-subtitle">積分：{points}/30</p>
        </div>

        {/* 转盘和按钮区域 */}
        <div className="spin-container">
          {/* 转盘 */}
          <div className="wheel-wrapper">
            <div
              className="wheel"
              ref={wheelRef}
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning ? 'transform 3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none'
              }}
            >
              {wheelItems.map((item, idx) => {
                const angle = (idx * itemAngle - 90)
                return (
                  <div
                    key={idx}
                    className="wheel-item"
                    style={{
                      transform: `rotate(${angle}deg)`,
                      background: getItemColor(idx, wheelItems.length)
                    }}
                  >
                    <div className="wheel-item-content" style={{ transform: `rotate(${90 - angle}deg)` }}>
                      {item.type === 'badge' ? (
                        <div className="badge-item">
                          <span className="badge-emoji">{item.emoji}</span>
                          <span className="badge-name">{item.label}</span>
                        </div>
                      ) : (
                        <div className="encouragement-item">
                          <span className="encouragement-text">{item.text.split(' ')[0]}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 指针 */}
            <div className="wheel-pointer" />
          </div>

          {/* 旋转按钮 */}
          <button
            className="spin-button"
            onClick={handleSpin}
            disabled={isSpinning || points < 30}
            title={points < 30 ? `需要 ${30 - points} 分積分才能轉盤` : '點擊轉盤'}
          >
            {isSpinning ? '轉動中...' : '開始轉盤'}
          </button>

          {/* 结果展示 */}
          {lastWheelResult && (
            <div className="spin-result">
              <div className="result-content">
                {lastWheelResult.type === 'badge' ? (
                  <>
                    <div className="result-emoji">{lastWheelResult.emoji}</div>
                    <p className="result-title">恭喜！解鎖成就</p>
                    <p className="result-badge">{lastWheelResult.label}</p>
                  </>
                ) : (
                  <>
                    <p className="result-title">收到祝福</p>
                    <p className="result-message">{lastWheelResult.text}</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 提示 */}
        {points < 30 && (
          <div className="spin-tip">
            💡 完成更多景點問答獲取積分，積分滿 30 分就能轉盤！
          </div>
        )}
      </div>
    </div>
  )
}

function getItemColor(index, total) {
  const colors = [
    'rgba(201, 169, 98, 0.8)', // 金色
    'rgba(139, 38, 53, 0.8)',  // 酒红色
    'rgba(156, 139, 122, 0.8)', // 棕色
    'rgba(74, 222, 128, 0.8)',  // 绿色
    'rgba(59, 130, 246, 0.8)',  // 蓝色
    'rgba(244, 114, 182, 0.8)'  // 粉色
  ]
  return colors[index % colors.length]
}
