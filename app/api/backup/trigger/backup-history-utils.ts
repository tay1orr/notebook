// 백업 기록 유틸리티 (메모리 기반 저장소)

// 글로벌 백업 기록 저장소 (초기 더미 데이터 포함)
let globalBackupHistory: Array<{
  id: string
  type: 'manual' | 'auto'
  status: 'success' | 'failed' | 'pending'
  timestamp: string
  triggeredBy?: string
  table: string
  size?: number
}> = [
  // 초기 더미 데이터 (서버 재시작 시에도 기본 데이터 유지)
  {
    id: 'init-auto-1',
    type: 'auto',
    status: 'success',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24시간 전
    triggeredBy: 'system',
    table: 'all',
    size: 850000
  }
]

export function addBackupRecord(record: {
  type: 'manual' | 'auto'
  status: 'success' | 'failed' | 'pending'
  table: string
  size?: number
  triggeredBy?: string
}) {
  const timestamp = new Date().toISOString()
  const newRecord = {
    id: Date.now().toString(),
    type: record.type,
    status: record.status,
    timestamp: timestamp,
    triggeredBy: record.triggeredBy || 'system',
    table: record.table,
    size: record.size
  }

  // 중복 방지: 최근 10초 내에 동일한 타입의 백업이 있는지 확인
  const recentThreshold = Date.now() - 10000 // 10초
  const isDuplicate = globalBackupHistory.some(existing =>
    existing.type === record.type &&
    existing.triggeredBy === newRecord.triggeredBy &&
    new Date(existing.timestamp).getTime() > recentThreshold
  )

  if (isDuplicate) {
    console.log('⚠️ 중복 백업 기록 방지:', newRecord)
    return globalBackupHistory[0] // 최신 기록 반환
  }

  globalBackupHistory.unshift(newRecord) // 앞에 추가 (최신순)

  // 최대 50개 기록만 유지
  if (globalBackupHistory.length > 50) {
    globalBackupHistory = globalBackupHistory.slice(0, 50)
  }

  console.log('📝 백업 기록 추가됨:', newRecord)
  console.log('📊 총 백업 기록 수:', globalBackupHistory.length)

  return newRecord
}

export function getBackupHistory() {
  // 이미 최신순으로 정렬되어 있음 (unshift 사용)
  console.log('📋 백업 기록 반환:', globalBackupHistory.length, '개')
  return [...globalBackupHistory] // 복사본 반환으로 원본 보호
}

export function clearBackupHistory() {
  globalBackupHistory = []
}