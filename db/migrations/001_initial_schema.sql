-- 001_initial_schema.sql
-- 인천중산고 노트북 관리 시스템 초기 스키마

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (Supabase Auth와 연동)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'homeroom', 'helper', 'teacher', 'student')),
  class_id UUID NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classes table (학급 정보)
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 3),
  name TEXT NOT NULL, -- 예: "1반", "2반"
  homeroom_teacher_id UUID NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(grade, name)
);

-- Students table (학생 정보)
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_no TEXT NOT NULL, -- 학번
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, student_no)
);

-- Devices table (기기 정보)
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_tag TEXT UNIQUE NOT NULL, -- 자산태그
  model TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  assigned_class_id UUID NULL REFERENCES classes(id),
  status TEXT NOT NULL CHECK (status IN ('충전함', '대여중', '점검', '분실')) DEFAULT '충전함',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loans table (대여 정보)
CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ NULL,
  approver_id UUID NULL REFERENCES users(id),
  picked_up_at TIMESTAMPTZ NULL,
  due_date TIMESTAMPTZ NOT NULL,
  returned_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL CHECK (status IN ('requested', 'approved', 'picked_up', 'returned', 'overdue')) DEFAULT 'requested',
  student_signature TEXT NULL, -- Base64 encoded signature or storage path
  helper_signature TEXT NULL,
  homeroom_signature TEXT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loan summaries table (일별 집계)
CREATE TABLE loan_summaries_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  total_loans INTEGER DEFAULT 0,
  total_returns INTEGER DEFAULT 0,
  remaining_devices INTEGER DEFAULT 0,
  unauthorized_count INTEGER DEFAULT 0, -- 무단대여(연체)
  overdue_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, class_id)
);

-- Audit logs table (감사로그)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID NULL REFERENCES users(id),
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'approve', 'pickup', 'return'
  entity_type TEXT NOT NULL, -- 'loan', 'device', 'student', 'user'
  entity_id UUID NOT NULL,
  old_values JSONB NULL,
  new_values JSONB NULL,
  metadata JSONB NULL, -- IP, User Agent 등 추가 정보
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- School calendar table (학사일정)
CREATE TABLE school_calendar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  is_school_day BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT, -- 휴업일 사유 등
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System settings table (시스템 설정)
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_class_id ON users(class_id);

CREATE INDEX idx_students_class_id ON students(class_id);
CREATE INDEX idx_students_email ON students(email);

CREATE INDEX idx_devices_asset_tag ON devices(asset_tag);
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_assigned_class ON devices(assigned_class_id);

CREATE INDEX idx_loans_device_id ON loans(device_id);
CREATE INDEX idx_loans_student_id ON loans(student_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loans_due_date ON loans(due_date);
CREATE INDEX idx_loans_created_at ON loans(created_at);

CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- 중복 대여 방지를 위한 Partial Unique Index
-- 열린 대여(requested, approved, picked_up)에 대해 기기/학생 각각 하나씩만 허용
CREATE UNIQUE INDEX idx_loans_device_active
ON loans(device_id)
WHERE status IN ('requested', 'approved', 'picked_up');

CREATE UNIQUE INDEX idx_loans_student_active
ON loans(student_id)
WHERE status IN ('requested', 'approved', 'picked_up');

-- 함수 및 트리거 생성

-- Updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Updated_at 트리거 적용
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON loans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 기기 상태 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_device_status()
RETURNS TRIGGER AS $$
BEGIN
  -- 대여 상태가 picked_up으로 변경되면 기기를 대여중으로 변경
  IF NEW.status = 'picked_up' AND OLD.status != 'picked_up' THEN
    UPDATE devices SET status = '대여중' WHERE id = NEW.device_id;
  END IF;

  -- 대여 상태가 returned나 overdue에서 다른 상태로 변경되면 기기를 충전함으로 변경
  IF (OLD.status IN ('picked_up', 'overdue') AND NEW.status IN ('returned')) THEN
    UPDATE devices SET status = '충전함' WHERE id = NEW.device_id;
  END IF;

  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_device_status_trigger
AFTER UPDATE ON loans
FOR EACH ROW EXECUTE FUNCTION update_device_status();

-- 감사로그 자동 생성 함수
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  actor_id_val UUID;
BEGIN
  -- 현재 사용자 ID 가져오기 (RLS context에서)
  actor_id_val := current_setting('app.current_user_id', true)::UUID;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_values)
    VALUES (actor_id_val, 'create', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (actor_id_val, 'update', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_values)
    VALUES (actor_id_val, 'delete', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

-- 감사로그 트리거 적용 (주요 테이블들)
CREATE TRIGGER audit_loans_trigger
AFTER INSERT OR UPDATE OR DELETE ON loans
FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_devices_trigger
AFTER INSERT OR UPDATE OR DELETE ON devices
FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_students_trigger
AFTER INSERT OR UPDATE OR DELETE ON students
FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_users_trigger
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- 외래키 제약조건 추가
ALTER TABLE classes ADD CONSTRAINT fk_classes_homeroom_teacher
  FOREIGN KEY (homeroom_teacher_id) REFERENCES users(id);

ALTER TABLE users ADD CONSTRAINT fk_users_class
  FOREIGN KEY (class_id) REFERENCES classes(id);

-- 기본 시스템 설정 값 삽입
INSERT INTO system_settings (key, value, description) VALUES
  ('calendar_enabled', 'false', '학사일정 기능 활성화 여부'),
  ('notifications_enabled', 'false', '알림 기능 활성화 여부'),
  ('loan_duration_days', '1', '기본 대여 기간 (일)'),
  ('return_deadline_hour', '8', '반납 마감 시간 (시)'),
  ('return_deadline_minute', '45', '반납 마감 시간 (분)'),
  ('max_concurrent_loans_per_student', '1', '학생별 최대 동시 대여 수'),
  ('max_concurrent_loans_per_device', '1', '기기별 최대 동시 대여 수');