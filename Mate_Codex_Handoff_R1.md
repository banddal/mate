# Mate — 코덱스 핸드오프 (Round 1)

> 이 문서는 매 라운드 종료 시 갱신됩니다. 백엔드/서버 설계는 Claude 담당(`Mate_Backend_Spec.md` 참조), 프론트엔드·운영은 코덱스 담당입니다.
> 제품 원칙 원문은 `Mate_MVP_PRD_v0.1.md` 참조 — 아래 "절대 규칙"은 그 요약본입니다.

---

## 이번 라운드에서 백엔드가 확정한 것

- DB 스키마(전체 DDL): `Mate_Backend_Spec.md` §1
- RLS 정책 방향: 동 문서 §2
- API 계약(엔드포인트 목록·요청/응답 규약): 동 문서 §3
- 프로필 마스킹 로직(`masked_profile_view`): 동 문서 §4
- Edge Function/Cron 트리거: 동 문서 §5

프론트엔드는 **Supabase 테이블을 직접 read/write하지 말고, 아래 API 계약을 통해서만** 카드 생성·신청·승인·마감·리뷰·신고를 처리해야 합니다. (이유: 마감 일괄 해소·소멸·L3 게이팅·프로필 마스킹이 전부 서버 로직이라, 클라이언트 직접 접근 시 원칙이 우회됨)

---

## 프론트엔드 작업 범위 (라우트별)

| 경로 | 필요한 API | UI 메모 |
|---|---|---|
| `/login` | `POST /api/auth/phone/request-otp`, `/verify-otp` | 카카오 OAuth는 Supabase Auth 표준 플로우 |
| `/onboarding` | `profiles` upsert (본인 행, RLS로 허용됨 — 직접 write 가능) | 닉네임/연령대/성별/카테고리 |
| `/feed` | `GET /api/cards` | 필터 chip(오늘/이번주/마감임박/카테고리), pull-to-refresh, 카드에 **프로필 사진 노출 금지** |
| `/cards/new` | `POST /api/cards` | 멀티스텝, `host_offer` 1급 필드는 별도 스텝으로 강조 |
| `/cards/[id]` | `GET /api/cards`(단건), `POST /api/cards/:id/apply` | 신청은 bottom sheet, 사유 100자 제한 UI 카운터 |
| `/cards/[id]/applicants` | `GET /api/cards/:id/applicants`, `POST /api/cards/:id/approve` | 응답이 이미 마스킹된 상태로 옴 — 프론트가 추가로 원본 프로필 요청하는 API 호출 만들지 말 것 |
| `/rooms/[id]` | Supabase Realtime 직접 구독(채팅만 예외적으로 클라이언트 직접), `POST /api/rooms/:id/close` | 신고 버튼 sticky, 연락처 교환 시 경고 배너(차단은 아님) |
| `/rooms/[id]/review` | `POST /api/rooms/:id/review` | 3토글 + 신고 + 이모지(이모지는 서버 전송 안 함, 로컬 표시만) |
| `/alerts` | `GET/POST /api/subscriptions` | UI에 "사람" 구독 옵션을 아예 넣지 말 것 (백엔드 스키마에도 없음) |
| `/admin/*` | `POST /api/admin/*` | 데스크탑 우선, 모바일 최소 동작 |

---

## 운영(Ops) 작업 범위

- Vercel 프로젝트 생성·환경변수 관리 (`SUPABASE_SERVICE_ROLE_KEY`는 서버 전용, 절대 `NEXT_PUBLIC_*`로 노출 금지)
- Supabase 프로젝트 프로비저닝, pg_cron 활성화
- 카카오 OAuth 앱 등록·리다이렉트 URI 설정
- SMS 인증 API 벤더 선정(국내 통신사 대응 — Twilio 단독은 부적합 가능성, 알리고/NHN Toast 등 검토) 및 키 발급
- Web Push VAPID 키 생성·서비스워커 등록
- 도메인 확보 + HTTPS (PWA/Push 전제조건)
- 신고 발생 시 `retention_archive` 접근 권한을 admin/운영자로 제한하는 접근 통제 확인

---

## 절대 규칙 (프론트/운영 작업 시 위반 금지)

1. 카드 리스트/상세에 **프로필 사진 노출 금지** (P1)
2. 카드 제목/설명에 감정 상태·취약성 공시 문구(실연/우울/외로움 등) 통과시키는 UI 만들지 말 것 — 서버 금지어 필터가 있어도 프론트에서 선제 안내 문구 필요 (P2)
3. 호스트가 카드에 걸 수 있는 것은 "상황에 이미 묶인 비용"뿐 — 현금 사례비 입력 필드 만들지 말 것 (P3)
4. 신청 거절은 **개별 통지 없음**, 마감 시 일괄 "매칭이 확정되었어요" 메시지만 (다크패턴 방지)
5. 모임 종료 후 채팅방 재접근 UI, 상대 프로필 재조회 버튼, 팔로우/DM 기능 — **만들지 않음** (P4)
6. 후기 화면에 외모·매력·호감·인기 점수 필드 **넣지 않음** — 사실 체크 4개 + 완료 배지만 (P5)
7. "호스트 구독"(사람 팔로우) 기능 절대 추가 금지 — 결정 로그(§7)에서 영구 기각됨

---

## 다음 라운드 예고
- L3 게이팅 조건 확정 → 프론트 신청/카드생성 폼에 조건 미충족 안내 UI 필요해질 예정
- 신고 상태 머신 확정 → 관리자 화면 상태 표시 UI 필요해질 예정
