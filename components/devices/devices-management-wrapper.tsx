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

        // 기기 목록과 대여 현황을 동시에 가져오기
        const [devicesResponse, loansResponse] = await Promise.all([
          fetch('/api/devices', { cache: 'no-store' }),
          fetch('/api/loans', { cache: 'no-store' })
        ])

        if (devicesResponse.ok && loansResponse.ok) {
          const devicesData = await devicesResponse.json()
          const loansData = await loansResponse.json()

          const deviceList = devicesData.devices || []
          const loansList = loansData.loans || []

          // 수령됨 상태인 대여 목록으로 기기 상태 업데이트
          const activeLoanDevices = new Set()
          loansList.forEach(loan => {
            if (loan.status === 'picked_up' && loan.device_tag) {
              // device_tag "2-1-11"을 asset_tag "ICH-20111" 형식으로 변환
              const parts = loan.device_tag.split('-')
              if (parts.length === 3) {
                const grade = parts[0]
                const classNum = parts[1].padStart(2, '0')
                const deviceNum = parts[2].padStart(2, '0')
                const serialNumber = `${grade}${classNum}${deviceNum}`
                const assetTag = `ICH-${serialNumber}`
                activeLoanDevices.add(assetTag)
              }
            }
          })

          // 기기 상태 업데이트: 수령됨 상태인 대여가 있으면 대여중으로 표시
          const updatedDeviceList = deviceList.map(device => {
            if (activeLoanDevices.has(device.assetNumber)) {
              const loan = loansList.find(l => {
                if (!l.device_tag) return false
                const parts = l.device_tag.split('-')
                if (parts.length === 3) {
                  const serialNumber = `${parts[0]}${parts[1].padStart(2, '0')}${parts[2].padStart(2, '0')}`
                  return `ICH-${serialNumber}` === device.assetNumber
                }
                return false
              })
              return {
                ...device,
                status: 'loaned',
                currentUser: loan?.student_name || device.currentUser
              }
            }
            return device
          })

          console.log('DevicesManagement - Loaded devices:', updatedDeviceList.length)
          console.log('DevicesManagement - Active loans found:', activeLoanDevices.size)
          console.log('DevicesManagement - Loaned devices:', updatedDeviceList.filter(d => d.status === 'loaned'))
          setDevices(updatedDeviceList)

          // 통계 계산
          const newStats = {
            total: updatedDeviceList.length,
            available: updatedDeviceList.filter(d => d.status === 'available').length,
            loaned: updatedDeviceList.filter(d => d.status === 'loaned').length,
            maintenance: updatedDeviceList.filter(d => d.status === 'maintenance').length,
            retired: updatedDeviceList.filter(d => d.status === 'retired').length
          }
          console.log('DevicesManagement - Stats:', newStats)
          setStats(newStats)
          setError(null)
        } else {
          const errorText = await (devicesResponse.ok ? loansResponse : devicesResponse).text()
          console.error('DevicesManagement - API error:', errorText)
          setError(`API 오류: ${errorText}`)
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