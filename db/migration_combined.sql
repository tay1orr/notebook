-- ===== COMBINED MIGRATION (001 + 002 + 003 + 004 + 005) =====
-- 006 was skipped due to schema mismatch (references nonexistent loan_applications table)

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
-- ==============================================
-- 002_rls_policies.sql
-- Row Level Security 정책 설정

-- RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_summaries_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper function to get current user class_id
CREATE OR REPLACE FUNCTION get_current_user_class_id()
RETURNS UUID AS $$
  SELECT class_id FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

-- Users table policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage all users" ON users
  FOR ALL USING (get_current_user_role() = 'admin');

CREATE POLICY "Users can update own profile (limited)" ON users
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM users WHERE id = auth.uid()));

-- Classes table policies
CREATE POLICY "Admin can manage all classes" ON classes
  FOR ALL USING (get_current_user_role() = 'admin');

CREATE POLICY "Homeroom teachers can view own class" ON classes
  FOR SELECT USING (
    get_current_user_role() = 'homeroom'
    AND homeroom_teacher_id = auth.uid()
  );

CREATE POLICY "Helpers can view assigned class" ON classes
  FOR SELECT USING (
    get_current_user_role() = 'helper'
    AND id = get_current_user_class_id()
  );

CREATE POLICY "Teachers can view all classes" ON classes
  FOR SELECT USING (get_current_user_role() IN ('teacher', 'homeroom', 'helper'));

-- Students table policies
CREATE POLICY "Admin can manage all students" ON students
  FOR ALL USING (get_current_user_role() = 'admin');

CREATE POLICY "Homeroom teachers can manage own class students" ON students
  FOR ALL USING (
    get_current_user_role() = 'homeroom'
    AND class_id IN (SELECT id FROM classes WHERE homeroom_teacher_id = auth.uid())
  );

CREATE POLICY "Helpers can manage assigned class students" ON students
  FOR ALL USING (
    get_current_user_role() = 'helper'
    AND class_id = get_current_user_class_id()
  );

CREATE POLICY "Teachers can view all students" ON students
  FOR SELECT USING (get_current_user_role() IN ('teacher', 'homeroom', 'helper'));

CREATE POLICY "Students can view own record" ON students
  FOR SELECT USING (
    get_current_user_role() = 'student'
    AND email = (SELECT email FROM users WHERE id = auth.uid())
  );

-- Devices table policies
CREATE POLICY "Admin can manage all devices" ON devices
  FOR ALL USING (get_current_user_role() = 'admin');

CREATE POLICY "Staff can view all devices" ON devices
  FOR SELECT USING (get_current_user_role() IN ('homeroom', 'helper', 'teacher'));

CREATE POLICY "Homeroom teachers can update devices" ON devices
  FOR UPDATE USING (get_current_user_role() = 'homeroom');

-- Loans table policies
CREATE POLICY "Admin can manage all loans" ON loans
  FOR ALL USING (get_current_user_role() = 'admin');

CREATE POLICY "Staff can create loans" ON loans
  FOR INSERT WITH CHECK (get_current_user_role() IN ('homeroom', 'helper'));

CREATE POLICY "Homeroom teachers can view own class loans" ON loans
  FOR SELECT USING (
    get_current_user_role() = 'homeroom'
    AND student_id IN (
      SELECT s.id FROM students s
      JOIN classes c ON s.class_id = c.id
      WHERE c.homeroom_teacher_id = auth.uid()
    )
  );

CREATE POLICY "Helpers can view assigned class loans" ON loans
  FOR SELECT USING (
    get_current_user_role() = 'helper'
    AND student_id IN (
      SELECT id FROM students WHERE class_id = get_current_user_class_id()
    )
  );

CREATE POLICY "Staff can update loans" ON loans
  FOR UPDATE USING (
    get_current_user_role() IN ('homeroom', 'helper')
    AND (
      -- Homeroom teachers for their class
      (get_current_user_role() = 'homeroom' AND student_id IN (
        SELECT s.id FROM students s
        JOIN classes c ON s.class_id = c.id
        WHERE c.homeroom_teacher_id = auth.uid()
      )) OR
      -- Helpers for their assigned class
      (get_current_user_role() = 'helper' AND student_id IN (
        SELECT id FROM students WHERE class_id = get_current_user_class_id()
      ))
    )
  );

CREATE POLICY "Teachers can view all loans" ON loans
  FOR SELECT USING (get_current_user_role() = 'teacher');

CREATE POLICY "Students can view own loans" ON loans
  FOR SELECT USING (
    get_current_user_role() = 'student'
    AND student_id IN (
      SELECT id FROM students WHERE email = (SELECT email FROM users WHERE id = auth.uid())
    )
  );

-- Loan summaries policies
CREATE POLICY "Staff can view loan summaries" ON loan_summaries_daily
  FOR SELECT USING (get_current_user_role() IN ('admin', 'homeroom', 'helper', 'teacher'));

CREATE POLICY "Admin can manage loan summaries" ON loan_summaries_daily
  FOR ALL USING (get_current_user_role() = 'admin');

-- Audit logs policies
CREATE POLICY "Admin can view all audit logs" ON audit_logs
  FOR SELECT USING (get_current_user_role() = 'admin');

CREATE POLICY "Staff can view relevant audit logs" ON audit_logs
  FOR SELECT USING (
    get_current_user_role() IN ('homeroom', 'helper')
    AND (
      actor_id = auth.uid() OR
      entity_id IN (
        SELECT l.id FROM loans l
        JOIN students s ON l.student_id = s.id
        WHERE s.class_id = get_current_user_class_id()
      )
    )
  );

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- School calendar policies
CREATE POLICY "Staff can view calendar" ON school_calendar
  FOR SELECT USING (get_current_user_role() IN ('admin', 'homeroom', 'helper', 'teacher'));

CREATE POLICY "Admin can manage calendar" ON school_calendar
  FOR ALL USING (get_current_user_role() = 'admin');

-- System settings policies
CREATE POLICY "Staff can view settings" ON system_settings
  FOR SELECT USING (get_current_user_role() IN ('admin', 'homeroom', 'helper', 'teacher'));

CREATE POLICY "Admin can manage settings" ON system_settings
  FOR ALL USING (get_current_user_role() = 'admin');

-- 공개 읽기 정책 (인증되지 않은 사용자도 특정 데이터 조회 가능)
-- 로그인 페이지에서 학교 도메인 확인 등을 위해 필요할 수 있음
CREATE POLICY "Public can view system info" ON system_settings
  FOR SELECT USING (key IN ('allowed_domains', 'maintenance_mode'));

-- Supabase Auth 연동을 위한 함수들
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 새 사용자가 auth.users에 추가되면 users 테이블에도 추가
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'student' -- 기본값, 관리자가 수동으로 변경
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.users 테이블에 트리거 추가 (Supabase에서 제공하는 경우에만)
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION handle_new_user();
-- ==============================================
-- 003_user_roles_table.sql
-- Supabase Auth와 연동을 위한 사용자 역할 테이블

-- Supabase Auth UUID와 역할을 매핑하는 테이블
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL, -- Supabase Auth user ID
  role TEXT NOT NULL CHECK (role IN ('admin', 'homeroom', 'helper', 'teacher', 'student')) DEFAULT 'student',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- Updated_at 트리거 적용
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 감사로그 트리거 적용
CREATE TRIGGER audit_user_roles_trigger
AFTER INSERT OR UPDATE OR DELETE ON user_roles
FOR EACH ROW EXECUTE FUNCTION create_audit_log();
-- ==============================================
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
-- ==============================================
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