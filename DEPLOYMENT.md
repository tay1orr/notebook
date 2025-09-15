# 배포 가이드

## Vercel 배포 단계별 가이드

### 1. Supabase 프로젝트 설정

#### 1.1 Supabase 프로젝트 생성
1. [Supabase](https://supabase.com)에 로그인
2. "New Project" 클릭
3. 프로젝트 이름: `notebook-management`
4. 지역: `Northeast Asia (Seoul)` 선택
5. 데이터베이스 비밀번호 설정
6. 프로젝트 생성 대기 (약 2-3분)

#### 1.2 데이터베이스 설정
1. Supabase Dashboard → SQL Editor
2. `db/migrations/001_initial_schema.sql` 파일 내용 복사하여 실행
3. `db/migrations/002_rls_policies.sql` 파일 내용 복사하여 실행
4. (선택사항) `db/seeds/001_sample_data.sql` 파일 내용 복사하여 샘플 데이터 추가

#### 1.3 Google OAuth 설정
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client IDs
4. Application type: Web application
5. Authorized redirect URIs 추가:
   ```
   https://your-project-id.supabase.co/auth/v1/callback
   ```
6. Client ID와 Client Secret 복사

#### 1.4 Supabase Auth 설정
1. Supabase Dashboard → Authentication → Providers → Google
2. Enable Google provider
3. Google OAuth Client ID와 Client Secret 입력
4. (중요) Authorized domains에 학교 도메인 추가: `ichungjungsan.kr`

### 2. Vercel 배포

#### 2.1 Vercel 프로젝트 연결
1. [Vercel](https://vercel.com) 로그인
2. "New Project" 클릭
3. GitHub에서 `tay1orr/notebook` 저장소 선택
4. Framework Preset: **Next.js** 자동 감지됨
5. Root Directory: `./` (기본값)

#### 2.2 환경변수 설정
Vercel Dashboard → Settings → Environment Variables에서 다음 환경변수들을 추가:

```env
# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# 인증 (필수)
NEXT_PUBLIC_ALLOWED_DOMAIN=ichungjungsan.kr

# 시간대 (필수)
# TZ=Asia/Seoul  # Vercel에서 지원하지 않음, 코드에서 직접 처리

# 기능 플래그 (선택사항)
FEATURE_CALENDAR_ENABLED=false
FEATURE_NOTIFICATIONS_ENABLED=false
```

#### 2.3 배포 실행
1. "Deploy" 버튼 클릭
2. 빌드 과정 확인 (약 2-3분)
3. 배포 완료 후 URL 확인

### 3. 도메인 설정 (선택사항)

#### 3.1 커스텀 도메인 추가
1. Vercel Dashboard → Settings → Domains
2. 도메인 입력 (예: `notebook.ichungjungsan.kr`)
3. DNS 설정 안내에 따라 도메인 공급자에서 설정

#### 3.2 Google OAuth 리디렉션 업데이트
커스텀 도메인을 설정한 경우:
1. Google Cloud Console → Credentials → OAuth 2.0 Client ID 편집
2. Authorized redirect URIs에 추가:
   ```
   https://notebook.ichungjungsan.kr/auth/callback
   ```

### 4. 초기 설정

#### 4.1 관리자 계정 설정
1. 배포된 사이트에 학교 관리자 계정으로 로그인
2. Supabase Dashboard → Table Editor → users 테이블
3. 관리자 계정의 `role`을 `admin`으로 변경:
   ```sql
   UPDATE users
   SET role = 'admin'
   WHERE email = 'admin@ichungjungsan.kr';
   ```

#### 4.2 학급 및 사용자 데이터 준비
1. CSV 템플릿 다운로드 (관리자 패널에서)
2. 학급, 학생, 기기 데이터 준비
3. 관리자 패널에서 CSV 업로드

### 5. 모니터링 및 유지보수

#### 5.1 Vercel 모니터링
- Vercel Dashboard → Analytics에서 사용량 확인
- Functions → Edge Functions에서 실행 로그 확인

#### 5.2 Supabase 모니터링
- Supabase Dashboard → Settings → Usage에서 사용량 확인
- Logs에서 데이터베이스 쿼리 로그 확인

#### 5.3 백업
- Supabase는 자동 백업 제공 (Pro 플랜)
- 정기적으로 중요 데이터 수동 백업 권장

## 문제 해결

### 빌드 에러
```bash
# 로컬에서 빌드 테스트
npm run build

# 타입 체크
npm run type-check

# 린트 체크
npm run lint
```

### 인증 문제
1. Google OAuth 설정 재확인
2. 도메인 제한 설정 확인
3. 리디렉션 URL 일치 여부 확인

### 데이터베이스 연결 문제
1. Supabase URL 및 키 확인
2. RLS 정책 적용 여부 확인
3. 네트워크 보안 그룹 설정 확인

## 보안 체크리스트

- [ ] 환경변수에 비밀키가 올바르게 설정됨
- [ ] Google OAuth 도메인 제한이 활성화됨
- [ ] Supabase RLS 정책이 적용됨
- [ ] HTTPS가 강제됨 (Vercel 기본)
- [ ] 관리자 계정이 올바르게 설정됨

## 성능 최적화

- [ ] Vercel 지역을 Seoul(icn1)로 설정
- [ ] 이미지 최적화 설정
- [ ] 캐싱 전략 구현
- [ ] 번들 크기 최적화

배포 완료 후 `https://notebook-flame.vercel.app`에서 시스템을 확인할 수 있습니다.