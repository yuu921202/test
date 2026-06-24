import { createContext, useContext, useState, useCallback } from 'react'

const GameificationContext = createContext()

export function GameificationProvider({ children, userInterests = [] }) {
  const [points, setPoints] = useState(0)
  const [completedQuizzes, setCompletedQuizzes] = useState(new Set())
  const [unlockedBadges, setUnlockedBadges] = useState(new Set())
  const [showSpinWheel, setShowSpinWheel] = useState(false)
  const [lastWheelResult, setLastWheelResult] = useState(null)

  // 所有可能的徽章（对应兴趣标签）
  const allBadges = [
    { id: 'history', label: '歷史迷', emoji: '🏛️', description: '探索歷史文化地標' },
    { id: 'food', label: '美食家', emoji: '🍜', description: '品嚐當地特色美食' },
    { id: 'shopping', label: '購物達人', emoji: '🛍️', description: '發現本地購物寶地' },
    { id: 'family', label: '家庭樂園', emoji: '👨‍👩‍👧‍👦', description: '親子同樂景點' },
    { id: 'nature', label: '自然探險家', emoji: '🌲', description: '親近自然風景' },
    { id: 'art', label: '文青探索者', emoji: '🎨', description: '欣賞藝術創意' }
  ]

  // 激励语句
  const encouragements = [
    '🎉 太棒了！繼續探索更多景點！',
    '✨ 你的旅程精彩紛呈！',
    '🌟 祝福你的旅途充滿驚喜！',
    '🎊 勇往直前，發現更多美景！',
    '💫 願你的冒險永無止境！',
    '🏆 你是這次旅程的主角！'
  ]

  // 添加积分
  const addPoints = useCallback((amount) => {
    setPoints(prev => prev + amount)
  }, [])

  // 完成测验
  const completeQuiz = useCallback((placeId) => {
    if (!completedQuizzes.has(placeId)) {
      setCompletedQuizzes(prev => new Set([...prev, placeId]))
      addPoints(10)
      return true
    }
    return false
  }, [completedQuizzes, addPoints])

  // 解锁徽章
  const unlockBadge = useCallback((badgeId) => {
    setUnlockedBadges(prev => new Set([...prev, badgeId]))
  }, [])

  // 生成轮盘奖项
  const generateWheelItems = useCallback(() => {
    const items = []

    // 添加3个对应用户兴趣的徽章奖项
    const relevantBadges = allBadges.filter(b =>
      userInterests.includes(b.id) && !unlockedBadges.has(b.id)
    )

    const badgesToAdd = relevantBadges.slice(0, 3)
    badgesToAdd.forEach(badge => {
      items.push({
        type: 'badge',
        id: badge.id,
        label: badge.label,
        emoji: badge.emoji
      })
    })

    // 如果徽章不足3个，补充其他未解锁的徽章
    if (items.length < 3) {
      const remainingBadges = allBadges.filter(b =>
        !userInterests.includes(b.id) && !unlockedBadges.has(b.id)
      )
      const toAdd = remainingBadges.slice(0, 3 - items.length)
      toAdd.forEach(badge => {
        items.push({
          type: 'badge',
          id: badge.id,
          label: badge.label,
          emoji: badge.emoji
        })
      })
    }

    // 添加3个鼓励语句
    for (let i = 0; i < 3; i++) {
      items.push({
        type: 'encouragement',
        id: `encouragement-${i}`,
        text: encouragements[i]
      })
    }

    return items.slice(0, 6) // 确保正好6个项目
  }, [userInterests, unlockedBadges])

  // 转盘获胜
  const spinWheel = useCallback(() => {
    const items = generateWheelItems()
    const randomIndex = Math.floor(Math.random() * items.length)
    const result = items[randomIndex]

    if (result.type === 'badge') {
      unlockBadge(result.id)
    }

    setLastWheelResult(result)
    return result
  }, [generateWheelItems, unlockBadge])

  // 检查是否可以转盘（积分 >= 30）
  const canSpin = points >= 30

  const value = {
    points,
    addPoints,
    completedQuizzes,
    completeQuiz,
    unlockedBadges,
    unlockBadge,
    allBadges,
    encouragements,
    showSpinWheel,
    setShowSpinWheel,
    canSpin,
    spinWheel,
    lastWheelResult,
    setLastWheelResult,
    generateWheelItems
  }

  return (
    <GameificationContext.Provider value={value}>
      {children}
    </GameificationContext.Provider>
  )
}

export function useGameification() {
  const context = useContext(GameificationContext)
  if (!context) {
    throw new Error('useGameification must be used within GameificationProvider')
  }
  return context
}
