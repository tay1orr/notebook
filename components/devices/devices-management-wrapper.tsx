'use client'

import { useState, useEffect } from 'react'
import { DevicesManagement } from './devices-management'

export function DevicesManagementWrapper() {
  const [devices, setDevices] = useState<any[]>([])
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    loaned: 0,
    maintenance: 0,
    retired: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadDevices = async () => {
      try {
        setLoading(true)
        console.log('DevicesManagement - Loading devices from API...')

        const response = await fetch('/api/devices', {
          cache: 'no-store'
        })

        if (response.ok) {
          const data = await response.json()
          const deviceList = data.devices || []

          console.log('DevicesManagement - Loaded devices:', deviceList.length)
          console.log('DevicesManagement - Loaned devices:', deviceList.filter(d => d.status === 'loaned'))
          setDevices(deviceList)

          // 통계 계산
          const newStats = {
            total: deviceList.length,
            available: deviceList.filter(d => d.status === 'available').length,
            loaned: deviceList.filter(d => d.status === 'loaned').length,
            maintenance: deviceList.filter(d => d.status === 'maintenance').length,
            retired: deviceList.filter(d => d.status === 'retired').length
          }
          console.log('DevicesManagement - Stats:', newStats)
          setStats(newStats)
          setError(null)
        } else {
          const errorText = await response.text()
          console.error('DevicesManagement - API error:', response.status, errorText)
          setError(`API 오류: ${response.status} - ${errorText}`)
        }
      } catch (error) {
        console.error('DevicesManagement - Failed to load devices:', error)
        setError(`기기 목록을 불러올 수 없습니다: ${error}`)
      } finally {
        setLoading(false)
      }
    }

    loadDevices()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">기기 목록을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center text-red-600">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="font-medium mb-2">오류 발생</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            새로고침
          </button>
        </div>
      </div>
    )
  }

  return <DevicesManagement devices={devices} stats={stats} />
}