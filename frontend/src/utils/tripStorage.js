const STORAGE_KEY = 'saved_trips'
const MAX_SAVED_TRIPS = 10

/**
 * 获取所有保存的行程
 * @returns {Array} 保存的行程数组，按时间倒序（最新的第一个）
 */
export function getSavedTrips() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('读取保存的行程失败:', error)
    return []
  }
}

/**
 * 检查该行程是否已经保存过（基于目的地、天数、预算）
 * @param {Object} tripData - 行程数据
 * @returns {boolean} 是否已保存
 */
export function isTripAlreadySaved(tripData) {
  try {
    const saved = getSavedTrips()
    return saved.some(trip =>
      trip.tripData.destination === tripData.destination &&
      trip.tripData.days === tripData.days &&
      trip.tripData.budget === tripData.budget
    )
  } catch (error) {
    console.error('检查行程是否已保存失败:', error)
    return false
  }
}

/**
 * 保存行程到 localStorage
 * @param {Object} tripData - 行程数据
 * @returns {Object} { success: boolean, message: string }
 */
export function saveTripToStorage(tripData) {
  try {
    if (!tripData || !tripData.destination) {
      return { success: false, message: '行程数据不完整' }
    }

    // 检查是否已存在相同的行程
    if (isTripAlreadySaved(tripData)) {
      return { success: false, message: '该行程已收藏' }
    }

    const saved = getSavedTrips()

    // 检查是否超过上限
    if (saved.length >= MAX_SAVED_TRIPS) {
      return {
        success: false,
        message: 'limit_exceeded',
        needsConfirmation: true
      }
    }

    // 创建新的行程记录
    const newTrip = {
      id: Date.now(),
      tripData,
      savedAt: new Date().toISOString()
    }

    saved.push(newTrip)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))

    return { success: true, message: '行程已保存' }
  } catch (error) {
    console.error('保存行程失败:', error)
    // 检查是否是配额错误
    if (error.name === 'QuotaExceededError') {
      return { success: false, message: '存储空间已满' }
    }
    return { success: false, message: '保存失败，请重试' }
  }
}

/**
 * 在超过上限时，覆盖最旧的行程
 * @param {Object} tripData - 行程数据
 * @returns {Object} { success: boolean, message: string }
 */
export function saveTripOverwriteOldest(tripData) {
  try {
    if (!tripData || !tripData.destination) {
      return { success: false, message: '行程数据不完整' }
    }

    let saved = getSavedTrips()

    // 如果已存在相同行程，先删除
    saved = saved.filter(trip =>
      !(trip.tripData.destination === tripData.destination &&
        trip.tripData.days === tripData.days &&
        trip.tripData.budget === tripData.budget)
    )

    // 如果还是超过上限，删除最旧的
    if (saved.length >= MAX_SAVED_TRIPS) {
      saved.shift() // 删除第一个（最旧的，因为是按倒序排列）
    }

    // 添加新行程
    const newTrip = {
      id: Date.now(),
      tripData,
      savedAt: new Date().toISOString()
    }

    saved.push(newTrip)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))

    return { success: true, message: '行程已保存（覆盖最旧的一笔）' }
  } catch (error) {
    console.error('覆盖保存行程失败:', error)
    return { success: false, message: '保存失败，请重试' }
  }
}

/**
 * 从存储中删除指定的行程
 * @param {number} tripId - 行程 ID
 * @returns {boolean} 是否删除成功
 */
export function removeTripFromStorage(tripId) {
  try {
    const saved = getSavedTrips()
    const filtered = saved.filter(trip => trip.id !== tripId)

    if (filtered.length === saved.length) {
      console.warn('未找到要删除的行程')
      return false
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    return true
  } catch (error) {
    console.error('删除行程失败:', error)
    return false
  }
}

/**
 * 格式化相对时间（如 "3 小时前"）
 * @param {string} isoString - ISO 时间字符串
 * @returns {string} 格式化的相对时间
 */
export function formatRelativeTime(isoString) {
  try {
    const time = new Date(isoString)
    const now = new Date()
    const diffMs = now - time
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins} 分钟前`
    if (diffHours < 24) return `${diffHours} 小时前`
    if (diffDays === 1) return '昨天'
    if (diffDays < 7) return `${diffDays} 天前`

    // 超过一周，显示日期
    return time.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit'
    })
  } catch (error) {
    console.error('格式化时间失败:', error)
    return '未知时间'
  }
}
