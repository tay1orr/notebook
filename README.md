# 인천중산고 노트북 관리 시스템

학급 노트북 가정 대여를 위한 디지털 관리 플랫폼입니다.

> 새 Vercel 프로젝트로 배포 테스트 중 🚀 (v2)

## 📋 개요

이 시스템은 기존 종이 양식 기반의 노트북 대여 관리를 디지털화하여 다음과 같은 기능을 제공합니다:

- **Google SSO 인증** - 학교 계정으로만 로그인 가능
- **역할 기반 권한 관리** - 관리자, 담임교사, 노트북 도우미, 교사, 학생
- **대여/승인/수령/반납 전 과정** 디지털화
- **전자서명** 지원
- **실시간 현황 대시보드**
- **연체 관리** 및 자동 알림
- **CSV 일괄 업로드** 기능

## 🏗️ 기술 스택

- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **UI Components**: shadcn/ui, Radix UI
- **Authentication**: Supabase Auth with Google OAuth
- **Deployment**: Vercel

## 🚀 빠른 시작

### 1. 프로젝트 클론

```bash
git clone https://github.com/tay1orr/notebook.git
cd notebook
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경변수 설정

`.env.local.example` 파일을 복사하여 `.env.local` 파일을 생성하고 환경변수를 설정합니다:

```bash
cp .env.local.example .env.local
```

#### 필수 환경변수

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# 학교 도메인 제한 (Google OAuth)
NEXT_PUBLIC_ALLOWED_DOMAIN=ichungjungsan.kr

# 시간대
TZ=Asia/Seoul

# 기능 플래그
FEATURE_CALENDAR_ENABLED=false
FEATURE_NOTIFICATIONS_ENABLED=false

# 사이트 URL (배포 시)
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
```

### 4. Supabase 설정

#### 4.1 Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 로그인하여 새 프로젝트 생성
2. 프로젝트 URL과 anon key를 환경변수에 설정

#### 4.2 데이터베이스 마이그레이션

```sql
-- db/migrations/001_initial_schema.sql 파일의 내용을
-- Supabase SQL Editor에서 실행
```

#### 4.3 RLS 정책 적용

```sql
-- db/migrations/002_rls_policies.sql 파일의 내용을
-- Supabase SQL Editor에서 실행
```

#### 4.4 샘플 데이터 추가 (선택사항)

```sql
-- db/seeds/001_sample_data.sql 파일의 내용을
-- Supabase SQL Editor에서 실행
```

#### 4.5 Google OAuth 설정

1. Supabase Dashboard → Authentication → Providers → Google
2. Google OAuth 설정:
   - Client ID와 Client Secret 입력
   - Authorized redirect URIs: `https://your-project.supabase.co/auth/v1/callback`
   - Google Workspace 도메인 제한 설정

### 5. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 애플리케이션을 확인합니다.

## 📊 데이터 초기화

### CSV 템플릿

#### 학생 데이터 (`students.csv`)
```csv
grade,class_name,student_no,name,email
1,1반,10101,김학생,student10101@ichungjungsan.kr
1,1반,10102,이학생,student10102@ichungjungsan.kr
```

#### 기기 데이터 (`devices.csv`)
```csv
asset_tag,model,serial,notes,assigned_class
NB-2024-001,LG gram 16,LG24001001,1학년 1반 할당,1-1
NB-2024-002,LG gram 16,LG24001002,1학년 1반 할당,1-1
```

### 학사일정 업로드

ICS 파일 또는 CSV 파일로 학사일정을 업로드할 수 있습니다:

```csv
date,is_school_day,description
2024-09-16,false,추석 연휴
2024-09-17,false,추석
2024-09-18,false,추석 연휴
```

## 👥 사용자 역할

| 역할 | 권한 | 설명 |
|------|------|------|
| **admin** | 모든 권한 | 시스템 관리자 |
| **homeroom** | 소속반 관리 | 담임교사 |
| **helper** | 대여 승인, 소속반 관리 | 노트북 도우미 |
| **teacher** | 조회 권한 | 일반 교사 |
| **student** | 개인 조회 | 학생 |

## 🔄 대여 프로세스

1. **신청** - 학생이 대여 신청 (또는 교사가 대신 신청)
2. **승인** - 노트북 도우미가 승인
3. **수령** - 종례 시간에 학생이 수령 (전자서명)
4. **반납** - 다음 등교일 조회시간 전 반납 (전자서명)

### 핵심 규칙

- **대여 기간**: 1일 (다음 등교일 08:45까지)
- **동시 대여**: 학생/기기당 1개씩만
- **연체 기준**: 반납 마감시간 초과
- **재대여**: 반납 후 즉시 가능

## 🕒 스케줄러

### 연체 처리 (매일 09:00 KST)

```sql
-- Supabase Edge Function에서 실행
UPDATE loans
SET status = 'overdue'
WHERE status = 'picked_up'
  AND due_date < NOW();
```

## 📱 모바일 지원

- 반응형 디자인으로 모바일 기기에서 최적화
- 터치 친화적 전자서명
- QR 코드 스캔 지원 (브라우저 카메라)

## 🔒 보안

- **RLS (Row Level Security)** 적용
- **도메인 제한** Google OAuth
- **역할 기반 접근 제어**
- **감사로그** 2년 보존
- **개인정보 마스킹**

## 📈 모니터링

### 주요 지표

- 일별/월별 대여 현황
- 연체율
- 기기 활용률
- 사용자별 활동

### 리포트

- CSV 다운로드
- 월별 집계
- 연체 현황
- 기기별 이용률

## 🚀 배포

### Vercel 배포

1. GitHub 저장소를 Vercel에 연결
2. 환경변수 설정:
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   NEXT_PUBLIC_ALLOWED_DOMAIN
   NEXT_PUBLIC_SITE_URL
   TZ=Asia/Seoul
   ```
3. 배포 완료

### 도메인 설정

- Vercel에서 커스텀 도메인 추가
- Google OAuth redirect URI 업데이트
- Supabase 인증 설정 업데이트

## 🔧 유지보수

### 백업

Supabase는 자동 백업을 제공합니다:
- Point-in-time recovery (Pro 플랜)
- 수동 백업: SQL dump 생성

### 복구 절차

```sql
-- 특정 시점으로 복구 (Supabase Dashboard)
-- 또는 백업 파일에서 복구
psql -h your-host -U postgres -d your-db < backup.sql
```

### 로그 확인

```bash
# Vercel 로그
vercel logs

# Supabase 로그는 Dashboard에서 확인
```

## 🆘 문제 해결

### 일반적인 문제

1. **로그인 불가**
   - 도메인 설정 확인
   - Google OAuth 설정 확인

2. **권한 오류**
   - 사용자 역할 확인
   - RLS 정책 확인

3. **데이터 동기화 문제**
   - 시간대 설정 확인 (Asia/Seoul)
   - 학사일정 데이터 확인

## 📞 지원

- 기술 문의: [이슈 트래커](https://github.com/tay1orr/notebook/issues)
- 학교 내 문의: notebook@ichungjungsan.kr

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 🔄 개발 로드맵

### Phase 1 (완료)
- [x] 기본 인증 시스템
- [x] 대여/승인/수령/반납 플로우
- [x] 전자서명
- [x] 기본 대시보드

### Phase 2 (예정)
- [ ] 알림 시스템 (이메일, 웹훅)
- [ ] 선택교과 대여
- [ ] 모바일 앱
- [ ] API 문서화

### Phase 3 (계획)
- [ ] 고급 리포팅
- [ ] 자동화 규칙
- [ ] 다국어 지원
- [ ] 외부 시스템 연동

---

> 인천중산고등학교 노트북 관리 시스템 v1.0
> 개발: 2024년 9월
> 문의: notebook@ichungjungsan.kr