// 백업 기록 유틸리티 (안정적인 저장소)

// 서버리스 환경에서 안정적인 백업 기록 관리
const BACKUP_STORAGE_KEY = 'notebook_backup_history'

// 글로벌 백업 기록 저장소
let globalBackupHistory: Array<{
  id: string
  type: 'manual' | 'auto'
  status: 'success' | 'failed' | 'pending'
  timestamp: string
  triggeredBy?: string
  table: string
  size?: number
}> = []

// 초기화 함수 - 서버 시작시 빈 배열로 초기화
function initializeBackupHistory() {
  if (!Array.isArray(globalBackupHistory)) {
    globalBackupHistory = []
    console.log('🔧 백업 기록 저장소 초기화 완료 - 빈 배열')
  }
}

// 모듈 로드 시 초기화
initializeBackupHistory()

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

  // 중복 방지:
  // 1. 동일한 ID가 이미 존재하는지 확인
  // 2. 최근 30초 내에 동일한 타입과 트리거의 백업이 있는지 확인
  const isDuplicateId = globalBackupHistory.some(existing =>
    existing.id === newRecord.id
  )
  const isDuplicateRecent = globalBackupHistory.some(existing =>
    existing.type === record.type &&
    existing.triggeredBy === newRecord.triggeredBy &&
    Math.abs(new Date(existing.timestamp).getTime() - new Date(newRecord.timestamp).getTime()) < 30000
  )

  if (isDuplicateId || isDuplicateRecent) {
    console.log('⚠️ 중복 백업 기록 방지:', newRecord)
    const latest = globalBackupHistory.find(h =>
      h.type === record.type && h.triggeredBy === newRecord.triggeredBy
    ) || globalBackupHistory[0]
    return latest
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
  // 매번 최신순으로 정렬하여 일관성 보장
  const sortedHistory = [...globalBackupHistory].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  console.log('📋 백업 기록 반환:', sortedHistory.length, '개')
  console.log('📋 최신 3개 기록:', sortedHistory.slice(0, 3).map(h => ({
    id: h.id,
    type: h.type,
    timestamp: h.timestamp,
    triggeredBy: h.triggeredBy
  })))

  return sortedHistory
}

export function clearBackupHistory() {
  globalBackupHistory = []
  console.log('🗑️ 백업 기록 저장소 완전 초기화됨')
}

// 디버깅용: 백업 기록 상태 확인
export function getBackupHistoryStatus() {
  return {
    count: globalBackupHistory.length,
    records: globalBackupHistory.map(r => ({
      id: r.id,
      type: r.type,
      timestamp: r.timestamp,
      triggeredBy: r.triggeredBy
    }))
  }
}