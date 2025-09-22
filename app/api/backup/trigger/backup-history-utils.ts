// 백업 기록 유틸리티 (메모리 기반 저장소)

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

export function addBackupRecord(record: {
  type: 'manual' | 'auto'
  status: 'success' | 'failed' | 'pending'
  table: string
  size?: number
  triggeredBy?: string
}) {
  const newRecord = {
    id: Date.now().toString(),
    type: record.type,
    status: record.status,
    timestamp: new Date().toISOString(),
    triggeredBy: record.triggeredBy || 'system',
    table: record.table,
    size: record.size
  }

  globalBackupHistory.push(newRecord)

  console.log('📝 백업 기록 추가됨:', newRecord)
  console.log('📊 총 백업 기록 수:', globalBackupHistory.length)

  return newRecord
}

export function getBackupHistory() {
  return globalBackupHistory.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
}

export function clearBackupHistory() {
  globalBackupHistory = []
}