import LZString from 'lz-string'

/**
 * 生成分享连结
 * @param {Object} tripData - 完整的行程数据
 * @returns {string} 分享连结
 */
export function generateShareLink(tripData) {
  try {
    // 1. 转换为 JSON 字符串
    const jsonString = JSON.stringify(tripData)

    // 2. 使用 LZ-string 压缩并直接转为 Base64
    const base64 = LZString.compressToBase64(jsonString)

    // 3. 转换为 URL-safe base64
    const urlSafeBase64 = base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')

    // 4. 组成完整链接
    const baseUrl = window.location.origin
    const shareLink = `${baseUrl}/shared?data=${urlSafeBase64}`

    return shareLink
  } catch (error) {
    console.error('生成分享连结失败:', error)
    throw new Error('无法生成分享连结')
  }
}

/**
 * 复制分享连结到剪贴簿
 * @param {Object} tripData - 完整的行程数据
 * @returns {Promise<boolean>} 是否复制成功
 */
export async function copyShareLink(tripData) {
  try {
    const shareLink = generateShareLink(tripData)

    // 检查是否支持 Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(shareLink)
      return true
    } else {
      // 降级方案：显示文本框让用户手动复制
      return false
    }
  } catch (error) {
    console.error('复制到剪贴簿失败:', error)
    return false
  }
}

/**
 * 从 URL 参数解析并还原行程数据
 * @returns {Object|null} 还原后的行程数据，或 null 如果解析失败
 */
export function parseTripFromURL() {
  try {
    // 获取 URL 参数
    const params = new URLSearchParams(window.location.search)
    const encodedData = params.get('data')

    if (!encodedData) {
      return null
    }

    // 1. 从 URL-safe base64 还原为标准 base64
    const base64 = encodedData
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      // 补齐 padding
      .padEnd(encodedData.length + (4 - (encodedData.length % 4)) % 4, '=')

    // 2. 使用 LZ-string 解压缩
    const jsonString = LZString.decompressFromBase64(base64)

    if (!jsonString) {
      console.error('解压缩失败')
      return null
    }

    // 3. 解析 JSON
    const tripData = JSON.parse(jsonString)

    // 验证基本结构
    if (!tripData.destination || !tripData.itinerary) {
      console.error('行程数据结构无效')
      return null
    }

    return tripData
  } catch (error) {
    console.error('解析分享链接失败:', error)
    return null
  }
}

/**
 * 获取分享链接信息文本
 * @param {Object} tripData - 行程数据
 * @returns {string} 分享信息
 */
export function getShareText(tripData) {
  return `我用 AI 旅游规划工具规划了一趟 ${tripData.destination} ${tripData.days} 天的行程，想跟你分享！`
}
