# Mate — 코덱스 핸드오프 (Round 4)

> 이전 라운드: `Mate_Codex_Handoff_R1/R2/R3.md`. 이번 라운드: admin 권한 구조 확정, 카카오/SMS 인증 프로바이더 확정, **성인 KYC는 지금 안 만들어도 됨(범위 축소)**.
> 상세 근거는 `Mate_Backend_Spec.md` §10·§11 참조.
> ⚠️ 여전히 설계 단계입니다 — 실제 Supabase/카카오 앱은 아직 등록되지 않았습니다.

---

## 이번 라운드에서 새로 생긴 것

1. **Admin 권한 = `admin_users` 테이블** (JWT custom claim 아님) — `moderator`/`superadmin` 2단계.
2. **카카오 로그인**은 Supabase Auth 내장 Kakao 프로바이더로 처리 (커스텀 OAuth 구현 불필요).
3. **휴대폰 인증**은 카카오 로그인과 완전히 별개 — Supabase 내장 Phone Auth 대신 자체 OTP(국내 SMS 벤더 연동).
4. **범위 축소**: 실제 성인 KYC 연동은 지금 만들지 않는다. 첫 시나리오가 L1(잠실 직관)만이라 L3가 아직 열리지 않으므로, `age_verified` 관련 화면/연동은 나중으로 미룸 — 지금 만들면 낭비.

---

## 프론트엔드 작업 (신규/변경)

| 항목 | 변경 내용 |
|---|---|
| `/login` | 카카오 로그인 버튼 → `supabase.auth.signInWithOAuth({ provider: 'kakao' })` 표준 플로우. 커스텀 구현 불필요 |
| 휴대폰 인증 화면 | 카카오 로그인 **성공 후 별도 단계**로 분리 — `POST /api/auth/phone/request-otp` → OTP 입력 → `POST /api/auth/phone/verify-otp`. 재전송 버튼은 60초 쿨다운(서버가 거부하니 UI도 선반영) |
| `/admin/*` | 역할별 화면 분기 — `moderator`는 카드검수/신고처리/금지어 화면만, `app_config` 설정 화면과 관리자 부여/회수 화면은 **`superadmin`에게만 노출** |
| **만들지 않아도 되는 것** | 성인 인증(KYC) 관련 온보딩 화면·API 연동 — L3를 실제로 열기로 결정하기 전까지 보류. 지금 리소스 쓰지 말 것 |

---

## 운영(Ops) 작업 (신규/변경)

- **카카오 디벨로퍼스 앱 등록** — REST API 키·Client Secret 발급, Redirect URI를 Supabase Auth 콜백 URL로 등록
- **국내 SMS 벤더 선정** — 알리고 / NCP SENS / NHN Toast 중 선택, API 키 발급 (Supabase 내장 Phone Auth는 안 씀 — 국내 통신사 지원 제한)
- **최초 superadmin 부트스트랩** — API로 만드는 플로우 없음. 배포 시 마이그레이션 스크립트에서 특정 `user_id`를 `admin_users`에 직접 insert (본인 카카오 계정으로 먼저 가입한 뒤 그 `user_id`를 수동 지정하는 방식 추천)
- **보류**: 성인 실명인증(KYC) 벤더 계약 — 지금 하지 않아도 됨. L3 오픈 결정 시점에 다시 논의

---

## 절대 규칙 추가 (Round 4)

12. `admin_users` 부여/회수는 **오직 superadmin API를 통해서만** — "관리자 되기" 셀프서비스 플로우를 어떤 화면에서도 만들지 않는다 (권한 상승 공격면 차단)
13. `moderator` 역할 계정에게는 `app_config` 값(트러스트스코어 가중치·L3 임계치)을 **읽기 화면에서도 보여주지 않는다** — superadmin 전용 화면으로 완전 분리

---

## 다음 라운드 예고
- 법정 최소 로그 보존 기간(`retention.standard_days`) — 법무 검토 필요, 확정되면 `retention_archive` 삭제 배치 정책에 반영
- 카드 검수 큐 상세(자동 금지어 필터 통과 후 수동 검수 대상 선정 기준) — 확정되면 `/admin` 카드 검수 화면 스펙 구체화
