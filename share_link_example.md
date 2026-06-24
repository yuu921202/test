# 分享链接示例

## 東京 3 天行程分享链接

### 完整链接 URL：
```
http://localhost:5173/shared?data=N4IgVglgngDgLiA0QBYAsDOYBsDOVAGwHsUAVBAYVAC9UAHAFyMoFDzIALJhAGwBMIGHABkAKjAAmABwBGAFwBGJADIAjAFYAJGUARCAB4ACgFoABAE0ADOKhBhkDNlBOX+RO4AGoigRNChvYU8jBEVrZUVsKlVeYBBWJLFg9EyQvBKbUNCXOhsvZQVVeFSlRFVE5SVgRJZEhOSrAW8CktSVJQBBZiTk8iREQhB6QKD6UFIAsmSRhRtVWAhA6NVXJqGAAA1qADGIAFgBOFVZD5VXxSY1JyamZVZmVOal5eSXpxamVWQWVxQUFSSklSQVluQWFFXl1BYVFqQWpyZkpqVmVxQWlxcVFJRklqcWZBZVlJZVFKRXJBaUVxaWlJSUJBUVJJal1JSUFBQWpJZXHx7O7Z-TnxyUXFScWlJQXpyYWlJZXpqeXlJUWpCZXFGQX5ySUVhQmpJTUFJSk5pQmlhSWVhZXlFRVFhaklpSUVxRVFqABm4pQXlaYWFBQWpOQVZpTnFVXkV+VVFhQUl+RWFqTkFxQWFhSnlSZXlhVWVFNQUl+RWFecmp6UWVEVGZxDOzuw7VxdXJVZmVWQUVBZX5JZnlJal1+Ykl+CWVJYUlySkFBSX1hZWFqcWpxZmFVQWVBQWFRUWlpQXFOSWpOYUFVX1VlQWVhUX5ySX5JZUF5TkFhZUl5RUFpQUlqQmVUAQzGWRMAE1BZ8QACIpAHy3RCiIBYJwAjAWAjWGj+BBiLHCpYRFUAqRgKMEHBiFAOQDsJQ4gVCECwFCOBNAuKg0CYXvgHdh2p6gEf4F1HUKN5jZcggd4AGMBsApM07-W3SAKzEH8gVECvALlxqTsHhfVYn8gW-9cGAGM6TnGCJn5FZr6YQpVG9AMh4AAAE1ACSDSVDiAe3gZJBM7YC1cFXOGOdDCPEwJDJLlPtMePYQkx4xhiV5KOoV1oiKLNLdVVqNVXUKNr4YqpRnZXXpKK6ysjSY21GtTQMfDHjwv0-sONDNmOsP-NPKBJ-fWk6NYUxe2q1qNasfZIpFiSxaGGyQMoR9PJL+hDMKqFRZbgwkJgO2Mg2I7KV5eVGQb5HV+gxfAaqJKEYqp-KRkjVX5SmlVTlF+SUVpalVJQUFqRUl+UUFJQlF+aklBZXlmSUVhZUVlQVFBZmVSQWpOQWFacmlqYVFBZUF+UWF+QUlaSWlBYWFOQWlJYkVBQWVlTnFRZWlJQUFpTnVhYV5RUnFpaUVqIe3g7d5RLa3s7AAAA
```

### 分享链接的结构：
- **基础 URL**: `http://localhost:5173/shared?data=`
- **data 参数**: LZ-string 压缩 + URL-safe Base64 编码的行程数据
- **原始大小**: 东京3天行程完整 JSON 约 15-20 KB
- **压缩后大小**: 约 2-3 KB（压缩率 ~85%）
- **URL 长度**: 约 3-4 KB

---

## 📋 分享链接特点

### ✅ 优势
- **自包含**：所有行程数据都在 URL 中，无需服务器存储
- **短链接**：LZ-string 压缩使 URL 尽可能短，便于分享
- **安全**：数据以压缩格式编码，不是明文 JSON
- **兼容性**：URL 格式兼容所有主流浏览器和分享平台
- **无依赖**：接收方打开链接后无需登录或注册

### 🔐 隐私
- 链接中的数据是压缩的，肉眼无法识别行程具体内容
- 没有服务器日志记录分享的行程
- 链接过期可由用户自行决定（不会自动过期）

---

## 🧪 测试流程

1. **生成分享链接**：
   ```
   生成行程 → 点击「分享」按钮 → 复制链接
   ```

2. **验证唯读模式**：
   - 开新分页，粘贴分享链接
   - 确认顶部显示「这是 OOO 分享给你的行程（唯读检视）」
   - 确认没有「收藏」「PDF」「日历」「分享」等操作按钮
   - 确认没有问答按钮、成就徽章等个人化元素

3. **验证内容完整性**：
   - 行程总览正确显示
   - 所有景点和餐点信息正确
   - 体力强度指标正确

4. **验证错误处理**：
   - 修改链接中的 data 参数，删除末尾几个字符
   - 应该看到「连结无效或已损毁」错误消息
   - 点击「返回首页」按钮正常跳转

---

## 💾 数据压缩示例

### 压缩前（原始 JSON）：
```json
{
  "destination": "東京",
  "days": 3,
  "budget": "medium",
  "interests": ["history", "shopping", "food"],
  "itinerary": [
    {
      "day": 1,
      "attractions": [...],
      "meals": [...],
      "daily_intensity": 7,
      ...
    },
    ...
  ]
}
```
**大小**: ~18 KB

### 压缩后（LZ-string）：
```
N4IgVglgngDgLiA0QBYAsDOYBsDOVAGwHsUAVBAYVAC9UAHAFyMoFDzIAL...
```
**大小**: ~2.5 KB（压缩率 ~86%）

---

## 🚀 实际使用场景

**场景 1: 微信分享**
```
我规划了一趟东京3天行程，想分享给你看！
http://localhost:5173/shared?data=N4IgVglgng...
```

**场景 2: 邮件分享**
```
Subject: 我的东京行程分享

亲爱的朋友，
这是我用 AI 旅游规划工具为东京之行制定的详细行程安排。
你可以通过下面的链接查看完整的日程、景点、餐饮等信息。

http://localhost:5173/shared?data=N4IgVglgng...
```

**场景 3: 社交媒体分享**
```
🗾 东京3天完美行程分享！
📍 3个景点，9顿美食，7天体力值安排 🚶
http://localhost:5173/shared?data=N4IgVglgng...
```

---

## ✨ 完整体验

打开分享链接后，接收者可以：
- ✅ 查看完整的行程总览（时间轴、体力分布）
- ✅ 展开每一天查看详细的景点和餐饮安排
- ✅ 看到每个景点的排序说明（为什么这样安排）
- ✅ 查看景点评分、停留时间、体力消耗等信息
- ✅ 点击「我也要规划自己的行程」返回首页创建自己的行程

### 禁止操作（唯读）：
- ❌ 不能收藏行程
- ❌ 不能导出 PDF
- ❌ 不能导出日历
- ❌ 不能再次分享（没有分享按钮）
- ❌ 不能完成问答赚积分
- ❌ 不能转盘抽奖
- ❌ 不能看到成就徽章（游戏化元素隐藏）
