import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './TripMap.css'

export default function TripMap({ tripData }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)

  useEffect(() => {
    if (!mapRef.current || !tripData) return

    // 初始化地圖
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([37.7749, -122.4194], 13)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(mapInstanceRef.current)
    }

    const map = mapInstanceRef.current
    map.eachLayer(layer => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer)
      }
    })

    // 收集所有景點座標
    const coordinates = []
    const dayColors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

    tripData.itinerary.forEach((day, dayIdx) => {
      const dayColor = dayColors[dayIdx % dayColors.length]

      if (day.attractions && day.attractions.length > 0) {
        day.attractions.forEach((attr, attrIdx) => {
          if (attr.location && attr.location.lat && attr.location.lng) {
            const coord = [attr.location.lat, attr.location.lng]
            coordinates.push(coord)

            // 添加標記
            const marker = L.circleMarker(coord, {
              radius: 6,
              fillColor: dayColor,
              color: '#fff',
              weight: 2,
              opacity: 1,
              fillOpacity: 0.85
            })

            marker.bindPopup(`
              <div class="marker-popup">
                <div class="popup-title">第 ${day.day} 天</div>
                <div class="popup-name">${attr.name}</div>
                <div class="popup-rating">★ ${attr.rating.toFixed(1)}</div>
              </div>
            `)

            marker.addTo(map)
          }
        })
      }
    })

    // 自動縮放至所有景點
    if (coordinates.length > 0) {
      const group = L.featureGroup(coordinates.map(c => L.marker(c)))
      map.fitBounds(group.getBounds().pad(0.1))
    }
  }, [tripData])

  return (
    <div className="trip-map">
      <h2>地圖</h2>
      <div ref={mapRef} className="map-container"></div>
      <p className="map-legend">彩色標記按日期分類。點擊標記查看詳情。</p>
    </div>
  )
}
