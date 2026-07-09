# Mate MVP Scope

MVP 단계에서 "무엇이 있고, 무엇이 잠자고 있고, 무엇이 없는지"를 한 곳에서 정의한다.
Claude/Codex 핸드오프와 기능 논의 시 이 문서를 기준으로 삼는다.

MVP의 검증 목표: **상황 카드 기반 1회성 오프라인 매칭이 실제로 성사되는가** (가입 → 카드 → 신청 → 승인 → Room → 후기).
North-star 지표: **주간 매칭 성사 수 (resolve된 카드 수)**.

## 1. MVP에 포함 (노출 중)

| 영역 | 기능 | 비고 |
| --- | --- | --- |
| 인증 | Google OAuth 로그인 (Supabase Auth) | 유일한 가입/로그인 수단 |
| 온보딩 | 닉네임/연령대/성별/관심 카테고리 프로필 | 카테고리 5그룹 × 3개 + 직접 입력 |
| 카드 | 상황 카드 작성/피드/상세/마감 | 현금성 패턴 검수, L3 차단 |
| 신청 | 참여 이유 기반 신청, 호스트 승인 | 승인 시 Room 생성 |
| Room | 매칭 확정자 간 메시지, 종료/정리 | cleanup cron |
| 후기 | Room 종료 후 상호 후기 | |
| 신고 | 카드/유저 신고, 관리자 처리 | 상태 머신 |
| 알림 | Web Push 파이프라인, 알림함 | dispatch cron |
| 구독 | 카테고리 구독 + 매칭 알림 | 레벨 게이팅, 상한 |
| 관리자 | admin 대시보드, cron 모니터 | `admin_users` 테이블 기반, production에서 dev 폴백 승격 금지 |
| 통계 | PostHog 이벤트 (핵심 퍼널 8종) | `NEXT_PUBLIC_POSTHOG_KEY` 없으면 자동 no-op |

## 2. 휴면 (코드는 있으나 미노출)

| 기능 | 현재 상태 | 재활성화 조건 |
| --- | --- | --- |
| 휴대폰 인증 | `request-otp` / `verify-otp` API 완성, SMS 발송 미구현(devOtp 반환). 온보딩/`/me` UI에서 노출하지 않음 | SMS 벤더 계약 후 UI 연결 |
| `profiles.phone_verified` | 스키마 유지, 전원 `false` | 인증 의무화 시점에 `phone_verified = false AND created_at < 시행일` 유저에게 추가 인증 게이트 적용. 필요 시 `verification_deadline` 컬럼 추가 |
| 신청자 목록 인증 배지 | `phone_verified` 조건부 렌더 (현재 아무도 표시 안 됨) | 인증 재개 시 자동 활성 |
| dev-auth 바이패스 | `DISABLE_DEV_AUTH_BYPASS` opt-out 구조. 테스트 편의를 위해 유지 중 | 외부 유저 공개 전 opt-in 전환 필수 (보안 이슈, 워크플랜 참고) |

### 휴대폰 인증 정책 (확정)

- MVP에서는 휴대폰 인증을 **요구하지 않는다**. SMS 비용/사업자 요건/가입 이탈 부담이 검증 목표 대비 과하다.
- 무인증 가입 유저의 기록은 `phone_verified=false`로 자연히 남으므로 별도 마킹이 필요 없다.
- 향후 인증 의무화 시: 시행일 이전 가입자에게 유예 기간을 두고 추가 인증을 요구하는 게이트를 적용한다.

## 3. MVP에서 제외 (코드 없음)

- SMS 발송 연동 (벤더 미계약)
- 결제/정산
- 반복 모임, 그룹/커뮤니티
- 소셜 그래프 (팔로우, 친구)
- 네이티브 앱 (모바일 웹 + PWA 푸시로 대체)
- 이메일 magic link / OTP (Google OAuth로 대체, R61)

## 4. MVP 공개 전 필수 체크리스트

- [ ] dev-auth opt-in 전환 (`VERCEL_ENV === "production"` 가드)
- [ ] 약관 / 개인정보처리방침 페이지
- [ ] 계정 탈퇴 플로우 (Supabase user 삭제 + 프로필/카드 처리 정책 결정: 익명화 vs 삭제)
- [ ] Sentry 등 에러 트래킹
- [ ] 구 카테고리 문자열 테스트 데이터 정리 (R83 잔여)
- [ ] PostHog 프로덕션 키 발급 및 Vercel env 등록
