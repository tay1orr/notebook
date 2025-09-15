# Claude Code 설정

이 프로젝트는 Claude Code를 위한 설정입니다.

## 개발 명령어

### 서버 실행
```bash
npm run dev
```

### 빌드
```bash
npm run build
```

### 타입 체크
```bash
npm run type-check
```

### 린트
```bash
npm run lint
```

### Supabase 타입 생성
```bash
npm run db:generate-types
```

## 주요 디렉토리 구조

```
├── app/                    # Next.js App Router
├── components/            # React 컴포넌트
│   ├── ui/               # 기본 UI 컴포넌트
│   ├── forms/            # 폼 컴포넌트
│   └── layout/           # 레이아웃 컴포넌트
├── lib/                  # 유틸리티 함수
├── types/                # TypeScript 타입 정의
├── db/                   # 데이터베이스 관련
│   ├── migrations/       # 마이그레이션 파일
│   └── seeds/           # 시드 데이터
└── supabase/            # Supabase 설정
```

## 환경변수 (.env.local)

다음 환경변수들이 필요합니다:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_ALLOWED_DOMAIN=ichungjungsan.kr
# TZ=Asia/Seoul  # Vercel에서 지원하지 않음
FEATURE_CALENDAR_ENABLED=false
FEATURE_NOTIFICATIONS_ENABLED=false
```

## 개발 시 참고사항

### 코딩 스타일
- TypeScript 사용
- Prettier + ESLint 설정 적용
- 컴포넌트는 PascalCase
- 파일명은 kebab-case

### 데이터베이스
- Supabase PostgreSQL 사용
- RLS (Row Level Security) 적용
- 마이그레이션 파일로 스키마 관리

### 인증
- Google OAuth via Supabase Auth
- 학교 도메인 제한
- 역할 기반 권한 관리

### 상태 관리
- React hooks
- Supabase real-time subscriptions
- Server Components 활용

이 프로젝트를 Claude Code에서 작업할 때 위 설정들을 참고하여 개발해주세요.