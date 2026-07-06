# Mate — 코덱스 핸드오프 (Round 3)

> Round 1·2(`Mate_Codex_Handoff_R1/R2.md`)에 이어지는 증분. 이번 라운드: `app_config`(설정값 운영), 알림 발송 큐(Web Push) 확정.
> 상세 근거는 `Mate_Backend_Spec.md` §8·§9 참조.
> ⚠️ 전체 문서군이 아직 설계 단계입니다 — Supabase/Next.js 프로젝트는 아직 실제로 만들어지지 않았습니다. 프로비저닝 시작 시점은 별도로 안내합니다.

---

## 이번 라운드에서 새로 생긴 것

1. **`app_config` 테이블** — L3 임계치, trust_score 가중치 등 숫자를 하드코딩하지 않고 admin이 조정 가능하게 분리. `scope='public'`인 값(예: L3 capacity 3~6, 신청사유 100자)만 `GET /api/config`로 프론트에 노출되고, 나머지(`internal`, 예: trust_score 60 임계치)는 서버 전용.
2. **알림 발송 큐(`notifications` + `push_subscriptions`)** — Web Push 발송을 큐 기반으로 처리, 재시도 정책(즉시→5분→20분→실패 확정) 포함.

---

## 프론트엔드 작업 (신규/변경)

| 항목 | 변경 내용 |
|---|---|
| 카드 생성 폼(L3) | capacity 범위(3~6), 신청 사유 글자수(100) 같은 값을 **하드코딩하지 말고** `GET /api/config`(public scope)에서 받아와 렌더링. 백엔드가 값을 바꿔도 프론트 재배포 없이 반영되게 |
| Web Push 권한 요청 UX | 언제 권한을 요청할지 설계 필요 — 추천: 온보딩 직후 바로 요청하지 말고, 첫 카드 신청/생성 등 "알림이 실제로 유용한 순간"에 요청 (권한 거부율 낮추는 통상 패턴) |
| `push_subscriptions` 등록 | `POST /api/push/subscribe`로 서비스워커의 PushSubscription 객체(endpoint, keys.p256dh, keys.auth) 전송 |
| 알림함 UI(선택) | `notifications` 테이블은 본인 행 select 가능 — 필요 시 인앱 알림 목록 화면에 활용 가능 (MVP 필수는 아님, 있으면 좋음 정도) |

---

## 운영(Ops) 작업 (신규/변경)

- **VAPID 키 생성** 및 Vercel 환경변수 등록 (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`)
- **`app_config` 초기 시드** — `Mate_Backend_Spec.md` §8 표의 기본값으로 초기 삽입 (마이그레이션 스크립트에 포함시킬 것)
- **발송 실패율 모니터링** — admin 대시보드에 `notifications.status='failed'` 비율 노출, 임계치 넘으면 알림(VAPID 설정 오류·구독 대량 만료 등 조기 감지)
- **설정값 변경 감사 로그 확인 프로세스** — `admin_actions`에 `config_update` 기록이 쌓이므로, 정기적으로(주 1회 등) L3 임계치가 임의로 낮아지지 않았는지 리뷰하는 절차 권장 (PRD §5 "초기 L3 공백은 버그가 아니라 설계다" 원칙 보호)

---

## 절대 규칙 추가 (Round 3)

10. `subscription_match`(상황 템플릿 알림) payload에 **상대방 식별 정보를 절대 포함하지 않는다** — 알림 문구는 카드 속성(장소·시간·카테고리)만 언급. "누가 신청했어요" 류 문구 금지 (호스트 구독 기각 원칙의 연장)
11. L3 임계치·trust_score 수식 등 `internal` scope 설정값은 **어떤 프론트 화면에서도 원값을 노출하지 않는다** (자격 미달 안내는 "무엇이 부족한지 방향"만 — 정확한 숫자·수식 노출 금지, 파밍 난이도 역산 방지)

---

## 다음 라운드 예고
- SMS/카카오 OAuth 프로바이더 확정 → 인증 관련 스키마·API 필드 조정 가능성
- admin 권한 부여 방식(Supabase custom claim vs `admin_users` 테이블) 확정 → `/admin` 라우트 가드 방식이 여기 의존
