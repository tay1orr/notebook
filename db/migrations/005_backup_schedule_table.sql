-- 백업 스케줄 설정을 위한 테이블 생성
CREATE TABLE IF NOT EXISTS backup_schedule (
    id SERIAL PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT true,
    schedule_type VARCHAR(20) NOT NULL DEFAULT 'daily', -- daily, weekly, monthly
    time VARCHAR(5) NOT NULL DEFAULT '02:00', -- HH:MM 형식
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Seoul',
    last_run TIMESTAMPTZ NULL,
    next_run TIMESTAMPTZ NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기본 스케줄 레코드 삽입 (매일 새벽 2시)
INSERT INTO backup_schedule (
    enabled,
    schedule_type,
    time,
    timezone,
    next_run,
    created_by
) VALUES (
    true,
    'daily',
    '02:00',
    'Asia/Seoul',
    (NOW() + INTERVAL '1 day')::date + TIME '02:00',
    'system'
) ON CONFLICT DO NOTHING;

-- RLS 활성화
ALTER TABLE backup_schedule ENABLE ROW LEVEL SECURITY;

-- 관리자만 접근 가능한 정책 생성
CREATE POLICY "관리자만 백업 스케줄 조회 가능" ON backup_schedule
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

CREATE POLICY "관리자만 백업 스케줄 수정 가능" ON backup_schedule
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- 업데이트 시간 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_backup_schedule_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_backup_schedule_updated_at
    BEFORE UPDATE ON backup_schedule
    FOR EACH ROW
    EXECUTE FUNCTION update_backup_schedule_timestamp();