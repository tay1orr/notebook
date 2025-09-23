-- 004_backup_history_table.sql
-- 백업 기록 테이블 생성

-- 백업 기록 테이블
CREATE TABLE backup_history (
  id TEXT PRIMARY KEY, -- timestamp 기반 ID
  type TEXT NOT NULL CHECK (type IN ('manual', 'auto')),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  timestamp TIMESTAMPTZ NOT NULL,
  triggered_by TEXT, -- 사용자 이메일 또는 'system'
  table_name TEXT NOT NULL, -- 백업된 테이블 이름
  file_size BIGINT, -- 백업 파일 크기 (bytes)
  error_message TEXT, -- 실패 시 오류 메시지
  metadata JSONB, -- 추가 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_backup_history_timestamp ON backup_history(timestamp DESC);
CREATE INDEX idx_backup_history_type ON backup_history(type);
CREATE INDEX idx_backup_history_status ON backup_history(status);
CREATE INDEX idx_backup_history_triggered_by ON backup_history(triggered_by);

-- Updated_at 트리거 적용
CREATE TRIGGER update_backup_history_updated_at BEFORE UPDATE ON backup_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 감사로그 트리거 적용
CREATE TRIGGER audit_backup_history_trigger
AFTER INSERT OR UPDATE OR DELETE ON backup_history
FOR EACH ROW EXECUTE FUNCTION create_audit_log();