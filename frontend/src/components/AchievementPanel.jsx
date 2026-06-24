import { useState } from 'react'
import { Award } from 'lucide-react'
import { useGameification } from '../GameificationContext'
import './AchievementPanel.css'

export default function AchievementPanel() {
  const { points, unlockedBadges, allBadges, canSpin, setShowSpinWheel } = useGameification()
  const [hoveredBadge, setHoveredBadge] = useState(null)

  const progressPercentage = Math.min((points / 30) * 100, 100)

  return (
    <div className="achievement-panel">
      <div className="achievement-header">
        <div className="achievement-title">
          <Award size={20} />
          <h3>我的成就</h3>
        </div>
        <div className="points-display">
          <span className="points-value">{points}</span>
          <span className="points-label">積分</span>
        </div>
      </div>

      {/* 积分进度条 */}
      <div className="progress-section">
        <div className="progress-info">
          <span className="progress-label">轉盤進度</span>
          <span className="progress-text">{points} / 30 分</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        {canSpin && (
          <button
            className="spin-button-small"
            onClick={() => setShowSpinWheel(true)}
            title="轉盤已解鎖！"
          >
            🎡 開啟幸運轉盤
          </button>
        )}
      </div>

      {/* 徽章网格 */}
      <div className="badges-grid">
        {allBadges.map((badge) => {
          const isUnlocked = unlockedBadges.has(badge.id)
          return (
            <div
              key={badge.id}
              className={`badge-card ${isUnlocked ? 'unlocked' : 'locked'}`}
              onMouseEnter={() => setHoveredBadge(badge.id)}
              onMouseLeave={() => setHoveredBadge(null)}
            >
              <div className="badge-visual">
                <span className={`badge-emoji ${isUnlocked ? '' : 'grayscale'}`}>
                  {badge.emoji}
                </span>
              </div>
              <div className="badge-info">
                <p className="badge-label">{badge.label}</p>
                {hoveredBadge === badge.id && (
                  <p className="badge-description">{badge.description}</p>
                )}
              </div>
              {!isUnlocked && <div className="badge-lock">🔒</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
