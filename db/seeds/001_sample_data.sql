-- 001_sample_data.sql
-- 개발 및 테스트용 샘플 데이터

-- 샘플 학급 생성
INSERT INTO classes (id, grade, name, active) VALUES
  ('11111111-1111-1111-1111-111111111111', 1, '1반', true),
  ('22222222-2222-2222-2222-222222222222', 1, '2반', true),
  ('33333333-3333-3333-3333-333333333333', 2, '1반', true),
  ('44444444-4444-4444-4444-444444444444', 2, '2반', true),
  ('55555555-5555-5555-5555-555555555555', 3, '1반', true),
  ('66666666-6666-6666-6666-666666666666', 3, '2반', true);

-- 샘플 사용자 생성 (실제 환경에서는 Google SSO를 통해 생성됨)
INSERT INTO users (id, email, name, role, class_id, active) VALUES
  -- 관리자
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@ichungjungsan.kr', '관리자', 'admin', null, true),

  -- 담임교사들
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'homeroom1-1@ichungjungsan.kr', '김담임', 'homeroom', '11111111-1111-1111-1111-111111111111', true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'homeroom1-2@ichungjungsan.kr', '이담임', 'homeroom', '22222222-2222-2222-2222-222222222222', true),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'homeroom2-1@ichungjungsan.kr', '박담임', 'homeroom', '33333333-3333-3333-3333-333333333333', true),

  -- 노트북 도우미들
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'helper1-1@ichungjungsan.kr', '최도우미', 'helper', '11111111-1111-1111-1111-111111111111', true),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'helper1-2@ichungjungsan.kr', '정도우미', 'helper', '22222222-2222-2222-2222-222222222222', true),

  -- 일반 교사
  ('gggggggg-gggg-gggg-gggg-gggggggggggg', 'teacher@ichungjungsan.kr', '일반교사', 'teacher', null, true),

  -- 학생들 (1학년 1반)
  ('10000001-0000-0000-0000-000000000001', 'student10101@ichungjungsan.kr', '김학생', 'student', '11111111-1111-1111-1111-111111111111', true),
  ('10000002-0000-0000-0000-000000000002', 'student10102@ichungjungsan.kr', '이학생', 'student', '11111111-1111-1111-1111-111111111111', true),
  ('10000003-0000-0000-0000-000000000003', 'student10103@ichungjungsan.kr', '박학생', 'student', '11111111-1111-1111-1111-111111111111', true);

-- 담임교사 지정
UPDATE classes SET homeroom_teacher_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE classes SET homeroom_teacher_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' WHERE id = '22222222-2222-2222-2222-222222222222';
UPDATE classes SET homeroom_teacher_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' WHERE id = '33333333-3333-3333-3333-333333333333';

-- 샘플 학생 생성
INSERT INTO students (id, class_id, student_no, name, email, phone, active) VALUES
  -- 1학년 1반
  ('s0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '10101', '김학생', 'student10101@ichungjungsan.kr', '010-1234-5601', true),
  ('s0000002-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '10102', '이학생', 'student10102@ichungjungsan.kr', '010-1234-5602', true),
  ('s0000003-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '10103', '박학생', 'student10103@ichungjungsan.kr', '010-1234-5603', true),
  ('s0000004-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '10104', '최학생', 'student10104@ichungjungsan.kr', '010-1234-5604', true),
  ('s0000005-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', '10105', '정학생', 'student10105@ichungjungsan.kr', '010-1234-5605', true),

  -- 1학년 2반
  ('s0000006-0000-0000-0000-000000000006', '22222222-2222-2222-2222-222222222222', '10201', '윤학생', 'student10201@ichungjungsan.kr', '010-1234-5606', true),
  ('s0000007-0000-0000-0000-000000000007', '22222222-2222-2222-2222-222222222222', '10202', '장학생', 'student10202@ichungjungsan.kr', '010-1234-5607', true),
  ('s0000008-0000-0000-0000-000000000008', '22222222-2222-2222-2222-222222222222', '10203', '임학생', 'student10203@ichungjungsan.kr', '010-1234-5608', true),

  -- 2학년 1반
  ('s0000009-0000-0000-0000-000000000009', '33333333-3333-3333-3333-333333333333', '20101', '한학생', 'student20101@ichungjungsan.kr', '010-1234-5609', true),
  ('s0000010-0000-0000-0000-000000000010', '33333333-3333-3333-3333-333333333333', '20102', '오학생', 'student20102@ichungjungsan.kr', '010-1234-5610', true);

-- 샘플 기기 생성
INSERT INTO devices (id, asset_tag, model, serial_number, assigned_class_id, status, notes) VALUES
  -- 1학년 1반 할당 기기
  ('d0000001-0000-0000-0000-000000000001', 'NB-2024-001', 'LG gram 16', 'LG24001001', '11111111-1111-1111-1111-111111111111', '충전함', '1학년 1반 할당'),
  ('d0000002-0000-0000-0000-000000000002', 'NB-2024-002', 'LG gram 16', 'LG24001002', '11111111-1111-1111-1111-111111111111', '충전함', '1학년 1반 할당'),
  ('d0000003-0000-0000-0000-000000000003', 'NB-2024-003', 'LG gram 16', 'LG24001003', '11111111-1111-1111-1111-111111111111', '충전함', '1학년 1반 할당'),
  ('d0000004-0000-0000-0000-000000000004', 'NB-2024-004', 'LG gram 16', 'LG24001004', '11111111-1111-1111-1111-111111111111', '충전함', '1학년 1반 할당'),
  ('d0000005-0000-0000-0000-000000000005', 'NB-2024-005', 'LG gram 16', 'LG24001005', '11111111-1111-1111-1111-111111111111', '충전함', '1학년 1반 할당'),

  -- 1학년 2반 할당 기기
  ('d0000006-0000-0000-0000-000000000006', 'NB-2024-006', 'LG gram 16', 'LG24001006', '22222222-2222-2222-2222-222222222222', '충전함', '1학년 2반 할당'),
  ('d0000007-0000-0000-0000-000000000007', 'NB-2024-007', 'LG gram 16', 'LG24001007', '22222222-2222-2222-2222-222222222222', '충전함', '1학년 2반 할당'),
  ('d0000008-0000-0000-0000-000000000008', 'NB-2024-008', 'LG gram 16', 'LG24001008', '22222222-2222-2222-2222-222222222222', '충전함', '1학년 2반 할당'),

  -- 2학년 1반 할당 기기
  ('d0000009-0000-0000-0000-000000000009', 'NB-2024-009', 'LG gram 17', 'LG24002001', '33333333-3333-3333-3333-333333333333', '충전함', '2학년 1반 할당'),
  ('d0000010-0000-0000-0000-000000000010', 'NB-2024-010', 'LG gram 17', 'LG24002002', '33333333-3333-3333-3333-333333333333', '충전함', '2학년 1반 할당'),

  -- 공통 예비 기기
  ('d0000011-0000-0000-0000-000000000011', 'NB-2024-011', 'Samsung Galaxy Book', 'SM24001001', null, '충전함', '공통 예비 기기'),
  ('d0000012-0000-0000-0000-000000000012', 'NB-2024-012', 'Samsung Galaxy Book', 'SM24001002', null, '충전함', '공통 예비 기기'),

  -- 점검중 기기
  ('d0000013-0000-0000-0000-000000000013', 'NB-2024-013', 'LG gram 16', 'LG24001013', null, '점검', '키보드 일부 키 불량');

-- 샘플 대여 기록 생성 (테스트용)
INSERT INTO loans (id, device_id, student_id, requested_at, approved_at, approver_id, picked_up_at, due_date, returned_at, status, notes) VALUES
  -- 완료된 대여 기록
  (
    'l0000001-0000-0000-0000-000000000001',
    'd0000001-0000-0000-0000-000000000001',
    's0000001-0000-0000-0000-000000000001',
    '2024-09-10 14:30:00+09',
    '2024-09-10 14:35:00+09',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '2024-09-10 16:20:00+09',
    '2024-09-11 08:45:00+09',
    '2024-09-11 08:30:00+09',
    'returned',
    '정상 반납'
  ),
  -- 현재 대여중
  (
    'l0000002-0000-0000-0000-000000000002',
    'd0000002-0000-0000-0000-000000000002',
    's0000002-0000-0000-0000-000000000002',
    '2024-09-14 15:00:00+09',
    '2024-09-14 15:05:00+09',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '2024-09-14 16:20:00+09',
    '2024-09-15 08:45:00+09',
    null,
    'picked_up',
    '주말 과제용'
  ),
  -- 승인 대기중
  (
    'l0000003-0000-0000-0000-000000000003',
    'd0000003-0000-0000-0000-000000000003',
    's0000003-0000-0000-0000-000000000003',
    '2024-09-15 13:00:00+09',
    null,
    null,
    null,
    '2024-09-16 08:45:00+09',
    null,
    'requested',
    '프로젝트 발표 준비'
  );

-- 샘플 일별 집계 데이터
INSERT INTO loan_summaries_daily (date, class_id, total_loans, total_returns, remaining_devices, unauthorized_count, overdue_count) VALUES
  ('2024-09-10', '11111111-1111-1111-1111-111111111111', 1, 0, 4, 0, 0),
  ('2024-09-11', '11111111-1111-1111-1111-111111111111', 0, 1, 5, 0, 0),
  ('2024-09-14', '11111111-1111-1111-1111-111111111111', 1, 0, 4, 0, 0),
  ('2024-09-15', '11111111-1111-1111-1111-111111111111', 1, 0, 3, 0, 0);

-- 샘플 학사일정 (2024년 9월 일부)
INSERT INTO school_calendar (date, is_school_day, description) VALUES
  ('2024-09-14', false, '토요일'),
  ('2024-09-15', false, '일요일'),
  ('2024-09-16', false, '추석 연휴'),
  ('2024-09-17', false, '추석'),
  ('2024-09-18', false, '추석 연휴'),
  ('2024-09-19', true, '정상 수업일'),
  ('2024-09-20', true, '정상 수업일');

-- 추가 시스템 설정
INSERT INTO system_settings (key, value, description) VALUES
  ('school_name', '인천중산고등학교', '학교명'),
  ('academic_year', '2024', '현재 학년도'),
  ('semester', '2', '현재 학기'),
  ('contact_email', 'notebook@ichungjungsan.kr', '시스템 관련 문의 이메일'),
  ('maintenance_message', '', '점검 안내 메시지'),
  ('allowed_domains', 'ichungjungsan.kr', '허용된 도메인 목록 (쉼표 구분)');

-- 감사로그 샘플 (수동 생성, 실제로는 트리거에 의해 자동 생성됨)
INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_values, metadata) VALUES
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'approve',
    'loan',
    'l0000001-0000-0000-0000-000000000001',
    '{"status": "approved", "approved_at": "2024-09-10T14:35:00+09:00"}',
    '{"ip": "192.168.1.100", "user_agent": "Mozilla/5.0"}'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'pickup',
    'loan',
    'l0000001-0000-0000-0000-000000000001',
    '{"status": "picked_up", "picked_up_at": "2024-09-10T16:20:00+09:00"}',
    '{"ip": "192.168.1.100", "user_agent": "Mozilla/5.0"}'
  );

-- 뷰 생성 (자주 사용되는 쿼리들)
CREATE VIEW v_active_loans AS
SELECT
  l.*,
  s.name as student_name,
  s.student_no,
  c.grade,
  c.name as class_name,
  d.asset_tag,
  d.model as device_model,
  u.name as approver_name
FROM loans l
JOIN students s ON l.student_id = s.id
JOIN classes c ON s.class_id = c.id
JOIN devices d ON l.device_id = d.id
LEFT JOIN users u ON l.approver_id = u.id
WHERE l.status IN ('requested', 'approved', 'picked_up', 'overdue');

CREATE VIEW v_overdue_loans AS
SELECT
  l.*,
  s.name as student_name,
  s.student_no,
  c.grade,
  c.name as class_name,
  d.asset_tag,
  d.model as device_model,
  EXTRACT(EPOCH FROM (NOW() - l.due_date))/3600 as hours_overdue
FROM loans l
JOIN students s ON l.student_id = s.id
JOIN classes c ON s.class_id = c.id
JOIN devices d ON l.device_id = d.id
WHERE l.status = 'overdue' OR (l.status = 'picked_up' AND l.due_date < NOW());

CREATE VIEW v_device_availability AS
SELECT
  c.id as class_id,
  c.grade,
  c.name as class_name,
  COUNT(d.id) as total_devices,
  COUNT(CASE WHEN d.status = '충전함' THEN 1 END) as available_devices,
  COUNT(CASE WHEN d.status = '대여중' THEN 1 END) as loaned_devices,
  COUNT(CASE WHEN d.status = '점검' THEN 1 END) as maintenance_devices,
  COUNT(CASE WHEN d.status = '분실' THEN 1 END) as lost_devices
FROM classes c
LEFT JOIN devices d ON c.id = d.assigned_class_id
WHERE c.active = true
GROUP BY c.id, c.grade, c.name
ORDER BY c.grade, c.name;