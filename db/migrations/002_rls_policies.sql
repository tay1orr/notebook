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