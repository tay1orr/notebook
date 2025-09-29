-- 성능 최적화를 위한 인덱스 추가
-- 실제 사용 패턴(150-200명, 30명 관리자)을 고려한 최적화

-- 1. 대여 신청 테이블 최적화 (가장 많이 사용되는 쿼리)
-- 학생들의 대여 현황 조회 (status별 정렬)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loan_applications_status_created
ON loan_applications(status, created_at DESC);

-- 학생별 대여 이력 조회
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loan_applications_email_created
ON loan_applications(email, created_at DESC);

-- 관리자의 클래스별 조회
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loan_applications_class_status
ON loan_applications(class_name, status);

-- 2. 기기 관리 최적화
-- 기기 상태별 조회 (available/loaned)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_devices_status_class
ON devices(status, assigned_class_id);

-- 기기 태그로 빠른 검색
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_devices_asset_tag
ON devices(asset_tag) WHERE status = 'available';

-- 3. 사용자 관리 최적화
-- 이메일로 사용자 조회 (로그인 시)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active
ON users(email) WHERE active = true;

-- 역할별 사용자 조회
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_active
ON users(role) WHERE active = true;

-- 4. 감사 로그 최적화 (관리자용)
-- 최근 활동 조회 (날짜순 정렬)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created_action
ON audit_logs(created_at DESC, action);

-- 특정 테이블의 변경 이력
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_table_created
ON audit_logs(table_name, created_at DESC);

-- 5. 클래스 정보 최적화
-- 활성 클래스 조회
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_classes_active_grade
ON classes(active, grade) WHERE active = true;

-- 담임교사별 클래스 조회
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_classes_homeroom_teacher
ON classes(homeroom_teacher_id) WHERE active = true;

-- 인덱스 추가 완료 로그
INSERT INTO audit_logs (action, table_name, details, created_at)
VALUES ('SYSTEM', 'performance_indexes',
        '성능 최적화 인덱스 추가 완료 - 실제 사용 패턴 기반',
        NOW());

-- 인덱스 사용량 모니터링을 위한 뷰 생성
CREATE OR REPLACE VIEW v_index_usage AS
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

COMMENT ON VIEW v_index_usage IS '인덱스 사용량 모니터링용 뷰';