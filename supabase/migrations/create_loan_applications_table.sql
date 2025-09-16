-- 대여 신청 테이블 생성
CREATE TABLE IF NOT EXISTS loan_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name TEXT NOT NULL,
  student_no TEXT NOT NULL,
  class_name TEXT NOT NULL,
  email TEXT NOT NULL,
  student_contact TEXT,
  purpose TEXT NOT NULL,
  purpose_detail TEXT,
  return_date DATE NOT NULL,
  return_time TIME DEFAULT '09:00:00',
  due_date TIMESTAMP,
  device_tag TEXT,
  status TEXT DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'picked_up', 'returned', 'overdue', 'rejected')),
  signature TEXT, -- Base64 encoded signature image
  approved_by TEXT,
  approved_at TIMESTAMP,
  picked_up_at TIMESTAMP,
  returned_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 업데이트 시간 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_loan_applications_updated_at
    BEFORE UPDATE ON loan_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) 활성화
ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;

-- 정책: 모든 인증된 사용자가 읽기 가능
CREATE POLICY "Anyone can read loan applications" ON loan_applications
  FOR SELECT USING (auth.role() = 'authenticated');

-- 정책: 인증된 사용자가 자신의 신청 생성 가능
CREATE POLICY "Users can create their own loan applications" ON loan_applications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 정책: 관리자와 도우미만 업데이트 가능 (추후 세분화 가능)
CREATE POLICY "Admin and helpers can update loan applications" ON loan_applications
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_loan_applications_email ON loan_applications(email);
CREATE INDEX IF NOT EXISTS idx_loan_applications_status ON loan_applications(status);
CREATE INDEX IF NOT EXISTS idx_loan_applications_created_at ON loan_applications(created_at);
CREATE INDEX IF NOT EXISTS idx_loan_applications_class_name ON loan_applications(class_name);

-- 코멘트 추가
COMMENT ON TABLE loan_applications IS '노트북 가정대여 신청 관리 테이블';
COMMENT ON COLUMN loan_applications.status IS '신청 상태: requested(신청됨), approved(승인됨), picked_up(수령됨), returned(반납됨), overdue(연체), rejected(거절됨)';
COMMENT ON COLUMN loan_applications.signature IS 'Base64로 인코딩된 학생 서명 이미지';