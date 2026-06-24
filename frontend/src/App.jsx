import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plane, AlertCircle, Loader, Bookmark } from 'lucide-react'
import TripForm from './components/TripForm'
import TripPlan from './components/TripPlan'
import TripMap from './components/TripMap'
import SavedTripsPage from './components/SavedTripsPage'
import SharedTripView from './components/SharedTripView'
import { GameificationProvider } from './GameificationContext'
import { parseTripFromURL } from './utils/shareTrip'
import './App.css'

function AppContent({ userInterests, setUserInterests }) {
  const [tripData, setTripData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('plan')
  const [viewMode, setViewMode] = useState('form') // 'form' | 'results' | 'saved' | 'shared'
  const [sharedTripData, setSharedTripData] = useState(null)

  // 检查 URL 是否包含分享链接
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('data')) {
      const parsedData = parseTripFromURL()
      if (parsedData) {
        setSharedTripData(parsedData)
        setViewMode('shared')
      } else {
        // 解析失败，显示错误
        setViewMode('shared')
      }
    }
  }, [])

  const handlePlanTrip = async (formData) => {
    setLoading(true)
    setError(null)
    setUserInterests(formData.interests)
    try {
      const response = await axios.post('http://localhost:8000/plan', {
        destination: formData.destination,
        days: parseInt(formData.days),
        budget: formData.budget,
        interests: formData.interests
      })
      setTripData(response.data)
      setViewMode('results')
      setActiveTab('plan')
    } catch (err) {
      setError(err.message || '生成行程失敗，請檢查後端服務')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLoadSavedTrip = (savedTripData) => {
    // 直接加载保存的行程，无需重新调用 API
    setTripData(savedTripData)
    setUserInterests(savedTripData.interests || [])
    setViewMode('results')
    setActiveTab('plan')
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <Plane size={28} className="header-icon" />
            <h1>旅遊規劃</h1>
          </div>
          <p className="header-subtitle">AI 自動規劃你的完美旅程</p>
        </div>
      </header>

      <div className="app-content">
        {/* 分享視圖 */}
        {viewMode === 'shared' && (
          <SharedTripView
            tripData={sharedTripData}
            onBackToHome={() => {
              setViewMode('form')
              window.history.pushState({}, '', '/')
            }}
          />
        )}

        {/* 表單視圖 */}
        {viewMode === 'form' && (
          <div className="form-section">
            <div className="form-top-buttons">
              <button
                className="view-saved-btn"
                onClick={() => setViewMode('saved')}
                title="查看已收藏的行程"
              >
                <Bookmark size={18} />
                已收藏的行程
              </button>
            </div>
            <TripForm onSubmit={handlePlanTrip} loading={loading} onLoadSavedTrip={handleLoadSavedTrip} />
            {error && (
              <div className="error-message">
                <AlertCircle size={18} />
                <span>錯誤：{error}</span>
              </div>
            )}
          </div>
        )}

        {/* 已收藏視圖 */}
        {viewMode === 'saved' && (
          <div className="saved-section">
            <button
              className="back-btn"
              onClick={() => setViewMode('form')}
              title="返回規劃頁面"
            >
              ← 返回規劃
            </button>
            <SavedTripsPage onLoadTrip={handleLoadSavedTrip} />
          </div>
        )}

        {/* 結果視圖 */}
        {viewMode === 'results' && tripData && (
          <div className="results-wrapper">
            <div className="results-top-buttons">
              <button
                className="back-to-form-btn"
                onClick={() => setViewMode('form')}
                title="返回規劃頁面"
              >
                ← 返回規劃
              </button>
              <div className="tabs">
                <button
                  className={`tab ${activeTab === 'plan' ? 'active' : ''}`}
                  onClick={() => setActiveTab('plan')}
                >
                  行程安排
                </button>
                <button
                  className={`tab ${activeTab === 'map' ? 'active' : ''}`}
                  onClick={() => setActiveTab('map')}
                >
                  地圖
                </button>
              </div>
            </div>

            <div className="results-section">
              {activeTab === 'plan' && <TripPlan tripData={tripData} />}
              {activeTab === 'map' && <TripMap tripData={tripData} />}
            </div>
          </div>
        )}

        {loading && (
          <div className="loading-container">
            <div className="loading-spinner">
              <Loader size={40} />
            </div>
            <div className="loading-text">正在生成行程...</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [userInterests, setUserInterests] = useState([])

  return (
    <GameificationProvider userInterests={userInterests}>
      <AppContent userInterests={userInterests} setUserInterests={setUserInterests} />
    </GameificationProvider>
  )
}
