/**
 * 格式化时间为 ICS 标准格式 (YYYYMMDDTHHMMSS)
 * @param {Date} date - 日期对象
 * @returns {string} 格式化的时间字符串
 */
function formatICSDateTime(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${year}${month}${day}T${hours}${minutes}${seconds}`
}

/**
 * 转义 ICS 格式中的特殊字符
 * @param {string} text - 需要转义的文本
 * @returns {string} 转义后的文本
 */
function escapeICSText(text) {
  if (!text) return ''
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

/**
 * 生成 ICS 格式的行程文件
 * @param {Object} tripData - 完整的行程数据
 * @returns {string} ICS 格式字符串
 */
export function generateICS(tripData) {
  if (!tripData || !tripData.destination || !tripData.itinerary) {
    throw new Error('无效的行程数据')
  }

  // 生成起始日期（如果没有指定则用明天）
  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() + 1)
  startDate.setHours(0, 0, 0, 0)

  // 收集所有事件
  const events = []
  let eventId = Date.now()

  // 定义餐点时间段（分钟）
  const mealTimes = {
    breakfast: { start: 8 * 60, end: 8.5 * 60 }, // 08:00-08:30
    lunch: { start: 12.5 * 60, end: 13.5 * 60 }, // 12:30-13:30
    dinner: { start: 18.5 * 60, end: 19.5 * 60 } // 18:30-19:30
  }

  /**
   * 检查时间是否与餐点重叠
   * @param {number} startMinutes - 开始时间（分钟）
   * @param {number} endMinutes - 结束时间（分钟）
   * @returns {number} 如果重叠，返回新的开始时间（分钟），否则返回原开始时间
   */
  const adjustForMeals = (startMinutes, endMinutes) => {
    const meals = ['breakfast', 'lunch', 'dinner']

    for (const mealType of meals) {
      const meal = mealTimes[mealType]
      // 如果景点时间与餐点重叠，把景点顺延到餐后
      if (startMinutes < meal.end && endMinutes > meal.start) {
        return Math.max(endMinutes, meal.end)
      }
    }

    return startMinutes
  }

  // 遍历每一天的行程
  tripData.itinerary.forEach((day) => {
    const dayDate = new Date(startDate)
    dayDate.setDate(dayDate.getDate() + day.day - 1)

    // 当天的景点排程（单位：分钟，从 09:00 开始）
    let currentMinutes = 9 * 60 // 09:00

    // 添加早餐事件
    if (day.meals && day.meals.length > 0) {
      const breakfastMeal = day.meals.find(m => m.time === '08:00')
      if (breakfastMeal) {
        const breakfastStart = new Date(dayDate)
        breakfastStart.setHours(8, 0, 0, 0)
        const breakfastEnd = new Date(dayDate)
        breakfastEnd.setHours(8, 30, 0, 0)

        events.push({
          uid: `meal-breakfast-${day.day}-${eventId++}`,
          dtstart: formatICSDateTime(breakfastStart),
          dtend: formatICSDateTime(breakfastEnd),
          summary: `早餐 - ${breakfastMeal.name}`,
          description: breakfastMeal.address ? `地址: ${breakfastMeal.address}` : ''
        })
      }
    }

    // 添加景点事件
    if (day.attractions && day.attractions.length > 0) {
      day.attractions.forEach((attraction, idx) => {
        const duration = attraction.duration_minutes || 60

        // 检查是否需要避开餐点时间
        const adjustedStart = adjustForMeals(currentMinutes, currentMinutes + duration)
        if (adjustedStart !== currentMinutes) {
          // 时间被顺延了，更新景点的开始时间
          currentMinutes = adjustedStart
        }

        const startDate_event = new Date(dayDate)
        startDate_event.setHours(
          Math.floor(currentMinutes / 60),
          currentMinutes % 60,
          0,
          0
        )

        const endDate_event = new Date(dayDate)
        const endMinutes = currentMinutes + duration
        endDate_event.setHours(
          Math.floor(endMinutes / 60),
          endMinutes % 60,
          0,
          0
        )

        events.push({
          uid: `attraction-${day.day}-${idx}-${eventId++}`,
          dtstart: formatICSDateTime(startDate_event),
          dtend: formatICSDateTime(endDate_event),
          summary: attraction.name,
          description: attraction.reason || ''
        })

        currentMinutes = endMinutes
      })
    }

    // 添加午餐事件
    if (day.meals && day.meals.length > 0) {
      const lunchMeal = day.meals.find(m => m.time === '12:30')
      if (lunchMeal) {
        const lunchStart = new Date(dayDate)
        lunchStart.setHours(12, 30, 0, 0)
        const lunchEnd = new Date(dayDate)
        lunchEnd.setHours(13, 30, 0, 0)

        events.push({
          uid: `meal-lunch-${day.day}-${eventId++}`,
          dtstart: formatICSDateTime(lunchStart),
          dtend: formatICSDateTime(lunchEnd),
          summary: `午餐 - ${lunchMeal.name}`,
          description: lunchMeal.address ? `地址: ${lunchMeal.address}` : ''
        })
      }
    }

    // 添加晚餐事件
    if (day.meals && day.meals.length > 0) {
      const dinnerMeal = day.meals.find(m => m.time === '18:00')
      if (dinnerMeal) {
        const dinnerStart = new Date(dayDate)
        dinnerStart.setHours(18, 30, 0, 0)
        const dinnerEnd = new Date(dayDate)
        dinnerEnd.setHours(19, 30, 0, 0)

        events.push({
          uid: `meal-dinner-${day.day}-${eventId++}`,
          dtstart: formatICSDateTime(dinnerStart),
          dtend: formatICSDateTime(dinnerEnd),
          summary: `晚餐 - ${dinnerMeal.name}`,
          description: dinnerMeal.address ? `地址: ${dinnerMeal.address}` : ''
        })
      }
    }
  })

  // 生成 ICS 格式字符串
  let ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Trip Planner//Travel Calendar//CN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${escapeICSText(tripData.destination)} ${tripData.days} 天行程
X-WR-CALDESC:AI生成的旅游行程日历
X-WR-TIMEZONE:UTC
`

  // 添加所有事件
  events.forEach((event) => {
    ics += `BEGIN:VEVENT
UID:${event.uid}@tripplanner.local
DTSTART:${event.dtstart}
DTEND:${event.dtend}
SUMMARY:${escapeICSText(event.summary)}
DESCRIPTION:${escapeICSText(event.description)}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
`
  })

  ics += `END:VCALENDAR`

  return ics
}

/**
 * 下载 ICS 文件
 * @param {Object} tripData - 完整的行程数据
 */
export function downloadICS(tripData) {
  try {
    const icsContent = generateICS(tripData)
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `${tripData.destination}_${tripData.days}天行程.ics`)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('生成 ICS 文件失败:', error)
    throw error
  }
}
