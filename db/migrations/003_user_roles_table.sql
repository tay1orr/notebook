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