# notebook 프로젝트 부활 작업 노트

> 2026-06-02 ~ 2026-06-04 작업 기록. 다음 세션 시작 시 이 파일 먼저 읽으면 컨텍스트 빠르게 잡힘.

## 배경

- 90일 비활성으로 Supabase 영구 정지 → 데이터 보존, 영구 복원 불가
- 새 Supabase 프로젝트 생성 + 백업에서 진짜 스키마 추출 + 코드 부활
- 새 Vercel 프로젝트로 재배포

## 핵심 정보

| 항목 | 값 |
|---|---|
| GitHub | `tay1orr/notebook` (main 브랜치) |
| 로컬 클론 | `C:\Users\user\notebook` |
| 운영 사이트 | https://notebook2-xi.vercel.app |
| Vercel 프로젝트 | `notebook2` |
| Supabase 프로젝트 | `notebook2` (`ebgahjmzjfazxwbonqgh`) |
| Supabase URL | https://ebgahjmzjfazxwbonqgh.supabase.co |
| Supabase DB 비밀번호 | `.env.local` 참고 (커밋 X) |
| 허용 도메인 | `gclass.ice.go.kr` |
| 관리자 이메일 | `taylorr@gclass.ice.go.kr` |
| Google OAuth Client | `Notebook Management System` (Google Cloud Console) |
| 폐기된 옛 Supabase | `rjpcfssnplnkexwvmhuf` (정지/영구 삭제됨, 코드/설정에서 제거) |

## 환경 정보

- 스택: Next.js 14 (App Router) + TypeScript + Supabase + Tailwind + shadcn/ui
- Supabase 인증: 옛날 JWT 키 시스템 사용 (`@supabase/auth-helpers-nextjs`). 새 `sb_publishable_...`/`sb_secret_...` 키는 호환 안 됨
- 폰트: Pretendard CDN
- 디자인 톤: 네이비(slate-900) + 골드 accent(amber-400) + stone-50 배경 — 학교/공공기관 신뢰감
- `db/migration_correct.sql`: 새 Supabase에 적용한 진짜 스키마 (백업에서 추출, 한 번만 실행됨)

## 완료된 작업 정리

### Phase 1 — 인프라 복구
- GitHub 클론, `npm install`
- 새 Supabase 프로젝트 생성 → 옛 JWT 키 발급
- Google OAuth 재설정 (새 secret 생성, 새 Supabase callback URL 추가)
- Supabase URL Configuration: Site URL + Redirect URLs (`https://notebook2-xi.vercel.app/**`, `http://localhost:3000/**`)
- Vercel 환경변수 등록 + 재배포

### Phase 2 — DB 스키마 부활
- `db/migrations/001~006` (정규화 스키마)는 코드와 안 맞음 → **폐기**
- `supabase/migrations/`도 일부만 있고 운영 스키마 누락
- **백업 파일에서 진짜 운영 스키마 추출**:
  - `C:\Users\user\Downloads\db_cluster-05-11-2025@16-41-44.backup.gz`
  - 추출 스크립트: `C:\Users\user\Downloads\extract_schema.py`
  - 결과: `db/migration_correct.sql` (DROP 잘못된 테이블 + 진짜 스키마 + backup_schedule 보충)
- 진짜 스키마 테이블: `audit_logs`, `backup_history`, `loan_applications`, `classes`, `devices`, `loans`(미사용), `user_roles`, `users` + 3 VIEW (`class_loan_stats`, `daily_loan_stats`, `device_loan_status`)
- 핵심: `loan_applications`가 메인 (denormalized — student_name/class_name/device_tag를 행에 직접 저장)

### Phase 3 — Dead code 청소
삭제됨:
- API: `/api/admin/{setup-database, setup-students-table, fix-table, add-class-columns, create-students-table}`, `/api/setup/*`, `/api/debug/user-info`, `/api/reset-roles`
- 페이지: `/app/reset-roles`
- 컴포넌트: `components/debug/*`, 중복 `signature-pad.tsx`, 미사용 `devices-management.tsx`, `users-management.tsx`, `users-management-wrapper.tsx`
- 기타: `clear-data.html`, `DEPLOYMENT_STATUS.md`

### Phase 4 — UI 리뉴얼 (시작)
- Pretendard 폰트 적용
- Tailwind 색상 토큰: primary=slate-900, accent=amber-400, bg=stone-50
- **헤더**: 다크 네이비, 학교명 부제, 골드 active 인디케이터, 모바일 메뉴 개선
- **대시보드 (admin)**: 좌측 컬러 보더 통계 카드, 학생 이니셜 아바타 + divide-y 리스트, 빠른 작업 박스
- localStorage/BroadcastChannel 폴백 제거 (Supabase 단일 소스)
- 폴링 5초/2초 → 30초

### Phase 5 — 역할 시스템 정리
사용자 결정 4역할: **admin / homeroom / helper / student** (teacher, manager 제거)

- `UserRole` 타입에서 `'manager'` 제거
- 14개 파일에서 `'manager'` 분기 제거
- admin 이메일 하드코딩 (`'taylorr@gclass.ice.go.kr'`) 제거 → `isAdminEmail()` 통일
- `/auth` Google `hd` 옵션 하드코딩 → `NEXT_PUBLIC_ALLOWED_DOMAIN` env
- `pending_helper` 시스템 제거 (helper는 가입 신청 흐름 없음 — 지정 방식)
- `/api/users`에서 `user_profiles` 테이블 참조 제거 → `user_metadata.class_info` 사용
- 잘못된 quote string 버그 수정 (`user-management.tsx`)

### Phase 6 — helper 지정 흐름
- **admin**: 사용자 관리에서 모든 역할 변경 가능 (Select)
- **homeroom**: 본인 반 학생만 student ↔ helper 토글 가능 (Select)
- `/api/users` PATCH에 권한 검증: 본인 반 + 현재 역할이 student/helper인 경우만 허용
- **즉시 적용 (동의 절차 없음)** — 사용자 의도

### Phase 7 — auth + RoleSelection 리디자인
- `/auth` 로그인 페이지: 네이비/골드 톤, 학교 로고, 깔끔한 Google 버튼
- `/setup` 역할 선택 페이지: 카드형 라디오, 슬레이트 톤, 정확한 안내 문구

## 알려진 이슈 / 향후 정리

### 다음에 손볼 만한 것

- ⏰ **시간/날짜 처리 점검** (Task #10): 사용자가 처음 명시. `getCurrentKoreaTime`, `return_time`, `due_date` 등 Asia/Seoul 일관성 + 대여 시 시간 정확하게 표시되는지
- 🎨 **나머지 페이지 디자인** (Task #11 잔여): 대여/기기/학생/통계/관리자 페이지 — 새 톤 적용
- ⚡ **성능 최적화** (Task #12):
  - 30초 폴링도 여전히 부담 가능 — React Query 같은 캐싱 도입 검토
  - 번들 크기 측정 (`npm run build`)
  - N+1 쿼리 검토 (`/api/users` 등 listUsers 후 각각 role 조회)
- 🧹 **남은 dead code/일관성**:
  - `console.log` 30+ 개 production noise — 정리
  - `public.users.role` vs `user_roles.role` 이중 관리 — `user_roles` 단일화
  - `auth/callback`에서 `public.users.role`이 'student'/'admin'으로 박혀있는데 사실 user_roles만 쓰임
  - `/api/admin/pending-homeroom`과 `/api/admin/pending-approvals` 중복 — 통합 가능
  - `loan_applications.approved_by_role` CHECK에 `'manager'` 남아있을 수 있음 — DB 마이그레이션으로 정리
- 🔐 **RLS 정책 검토**: `public.users` INSERT 정책 없어서 처음 가입자가 막혔던 문제 (admin client로 우회 중). 정상적 RLS 정책 추가 검토
- 🗄️ **불필요 테이블**: `public.loans` (옛 잔재, 코드 사용 안 함), `backup_schedule`/`backup_history` 실제 사용 빈도 확인

### 그대로 두기로 한 것

- `teacher` 역할: DB CHECK에는 남아있지만 코드에서 안 씀. 사용자 결정: 둠
- `db/migrations/001~006`: 폐기된 옛 스키마지만 기록용으로 남김 (실수 방지 위해 NOTES.md에 명시)
- `design_preview/`: 로컬 시안 폴더, `.gitignore`로 처리

## 주의사항

- ⚠️ `.env.local` 절대 commit 금지 (이미 .gitignore)
- ⚠️ `db/migrations/006_performance_indexes.sql` 실행 금지 (스키마 불일치, `loan_applications` 가정)
- ⚠️ Supabase JWT 키를 Vercel 환경변수에 paste할 때 **줄바꿈/공백 들어가면 인증 깨짐**. 한 줄로 paste 확인
- ⚠️ 백업 파일 `db_cluster-...backup.gz`는 `Downloads/`에 둠. 다른 경로로 옮기지 말 것 (NOTES.md에서 참조 중)

## 다음 작업 시작 시 빠른 점검

```bash
cd C:\Users\user\notebook
npm install          # 새 환경이면
npm run dev          # 로컬: http://localhost:3000
npm run type-check   # 타입 검증
git pull             # 원격 최신 가져오기
```

운영 사이트: https://notebook2-xi.vercel.app
