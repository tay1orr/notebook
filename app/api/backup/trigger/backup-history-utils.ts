// 백업 기록 유틸리티 (Supabase 데이터베이스 저장)

import { createAdminClient } from '@/lib/supabase-server'

// 백업 기록 타입 정의
export interface BackupRecord {
  id: string
  type: 'manual' | 'auto'
  status: 'success' | 'failed' | 'pending'
  timestamp: string
  triggeredBy?: string
  table: string
  size?: number
}

// Supabase 클라이언트 생성 함수
function getSupabaseClient() {
  return createAdminClient()
}

export async function addBackupRecord(record: {
  type: 'manual' | 'auto'
  status: 'success' | 'failed' | 'pending'
  table: string
  size?: number
  triggeredBy?: string
}): Promise<BackupRecord> {
  const supabase = getSupabaseClient()
  const timestamp = new Date().toISOString()
  const id = Date.now().toString()

  const newRecord: BackupRecord = {
    id,
    type: record.type,
    status: record.status,
    timestamp,
    triggeredBy: record.triggeredBy || 'system',
    table: record.table,
    size: record.size
  }

  try {
    // 중복 방지: 최근 30초 내에 동일한 타입과 트리거의 백업이 있는지 확인
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString()

    const { data: existingRecords, error: checkError } = await supabase
      .from('backup_history')
      .select('id, timestamp')
      .eq('type', record.type)
      .eq('triggered_by', newRecord.triggeredBy)
      .gte('timestamp', thirtySecondsAgo)
      .limit(1)

    if (checkError) {
      console.error('백업 기록 중복 체크 실패:', checkError)
    } else if (existingRecords && existingRecords.length > 0) {
      console.log('⚠️ 중복 백업 기록 방지:', newRecord)
      // 기존 기록을 반환
      const existing = existingRecords[0]
      return {
        ...newRecord,
        id: existing.id,
        timestamp: existing.timestamp
      }
    }

    // 새 백업 기록 추가
    const { data, error } = await supabase
      .from('backup_history')
      .insert([{
        id: newRecord.id,
        type: newRecord.type,
        status: newRecord.status,
        timestamp: newRecord.timestamp,
        triggered_by: newRecord.triggeredBy,
        table_name: newRecord.table,
        file_size: newRecord.size
      }])
      .select()
      .single()

    if (error) {
      console.error('❌ 백업 기록 DB 저장 실패:', error)
      throw error
    }

    console.log('✅ 백업 기록 DB에 저장됨:', newRecord)

    // 기록 수 제한 (최신 100개만 유지)
    const { error: cleanupError } = await supabase
      .from('backup_history')
      .delete()
      .lt('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // 30일 이전 기록 삭제

    if (cleanupError) {
      console.warn('⚠️ 백업 기록 정리 실패 (무시됨):', cleanupError)
    }

    return newRecord

  } catch (error) {
    console.error('❌ 백업 기록 추가 실패:', error)
    throw error
  }
}

export async function getBackupHistory(): Promise<BackupRecord[]> {
  const supabase = getSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('backup_history')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100) // 최신 100개만 조회

    if (error) {
      console.error('❌ 백업 기록 DB 조회 실패:', error)
      return []
    }

    // 데이터베이스 형식을 BackupRecord 형식으로 변환
    const backupRecords: BackupRecord[] = (data || []).map(row => ({
      id: row.id,
      type: row.type,
      status: row.status,
      timestamp: row.timestamp,
      triggeredBy: row.triggered_by,
      table: row.table_name,
      size: row.file_size
    }))

    console.log('✅ 백업 기록 DB에서 조회됨:', backupRecords.length, '개')
    console.log('📋 최신 3개 기록:', backupRecords.slice(0, 3).map(h => ({
      id: h.id,
      type: h.type,
      timestamp: h.timestamp,
      triggeredBy: h.triggeredBy
    })))

    return backupRecords

  } catch (error) {
    console.error('❌ 백업 기록 조회 실패:', error)
    return []
  }
}

export async function clearBackupHistory(): Promise<void> {
  const supabase = getSupabaseClient()

  try {
    const { error } = await supabase
      .from('backup_history')
      .delete()
      .neq('id', 'never_matches') // 모든 기록 삭제

    if (error) {
      console.error('❌ 백업 기록 DB 초기화 실패:', error)
      throw error
    }

    console.log('🗑️ 백업 기록 DB 완전 초기화됨')

  } catch (error) {
    console.error('❌ 백업 기록 초기화 실패:', error)
    throw error
  }
}

// 디버깅용: 백업 기록 상태 확인
export async function getBackupHistoryStatus() {
  const supabase = getSupabaseClient()

  try {
    const { data, error, count } = await supabase
      .from('backup_history')
      .select('id, type, timestamp, triggered_by', { count: 'exact' })
      .order('timestamp', { ascending: false })
      .limit(10)

    if (error) {
      console.error('❌ 백업 기록 상태 조회 실패:', error)
      return { count: 0, records: [] }
    }

    return {
      count: count || 0,
      records: (data || []).map(r => ({
        id: r.id,
        type: r.type,
        timestamp: r.timestamp,
        triggeredBy: r.triggered_by
      }))
    }

  } catch (error) {
    console.error('❌ 백업 기록 상태 확인 실패:', error)
    return { count: 0, records: [] }
  }
}