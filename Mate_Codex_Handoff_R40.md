# Mate Codex Handoff R40

> Date: 2026-07-07
> Round: 40
> Author: Claude (백엔드 마감 — Web Push 구독 API)
> Theme: push_subscriptions 저장/해지 API 완성 → 알림 파이프라인 완결
> 참고: 프론트엔드(서비스워커/구독 UI)는 코덱스 담당. 이 문서는 그 연결 계약서.

## 이번 라운드에서 한 일

R39에서 알림 발송(dispatch cron)까지 만들었지만, 발송할 대상인 `push_subscriptions`에 구독을 넣는 경로가 없었다. 그 마지막 고리를 채웠다. 이제 백엔드 알림 파이프라인이 한 바퀴 완결된다:

**구독 저장(subscribe) → 이벤트 발생 시 알림 생성(approve 등) → dispatch cron 발송 → 죽은 구독 자동 정리**

## 추가된 백엔드 API (프론트가 호출할 것)

### 1. `GET /api/push/config`
푸시 사용 가능 여부와 VAPID public key를 내려준다. 프론트는 구독 UI를 켜기 전에 이걸 먼저 확인한다.
```
응답: { data: { enabled: boolean, vapidPublicKey: string | null }, error: null }
```
- `enabled=false`면 서버에 VAPID 키가 없는 것 → 구독 UI를 숨긴다.
- `vapidPublicKey`는 `applicationServerKey`로 변환해 `pushManager.subscribe()`에 넘긴다(urlBase64ToUint8Array 필요).

### 2. `POST /api/push/subscribe`
브라우저 PushSubscription을 저장한다. 로그인 + 온보딩 완료 유저만.
```
요청 body: PushSubscription.toJSON() 그대로
  { endpoint: string, keys: { p256dh: string, auth: string } }
응답: { data: { subscription: { id } }, error: null }
```
- endpoint는 unique. 같은 기기 재구독/소유자 변경은 upsert로 자동 처리(현재 유저로 갱신).

### 3. `POST /api/push/unsubscribe`
자기 소유 구독을 해지한다.
```
요청 body: { endpoint: string }
응답: { data: { unsubscribed: true }, error: null }
```

## 프론트(코덱스)가 해야 할 일 — 최소 계약

1. **서비스워커 등록** (`/sw.js` 등) — `push` 이벤트 수신 → `self.registration.showNotification()`.
   - dispatch가 보내는 payload 형태: `{ type: string, payload: {...} }` (JSON 문자열). `type`별로 표시 문구를 분기한다.
   - 알림 타입: `application_resolved`(승인 확정), `card_review_resolved`(검수 결과, payload.outcome = approved|rejected), 추후 `subscription_match`/`report_status_change`.
2. **구독 플로우**:
   - `GET /api/push/config` → enabled 확인, vapidPublicKey 획득
   - `Notification.requestPermission()` → granted면
   - `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`
   - 결과 `subscription.toJSON()`을 `POST /api/push/subscribe`로 전송
3. **해지 시** `subscription.endpoint`를 `POST /api/push/unsubscribe`로 전송하고 `subscription.unsubscribe()`.
4. **PWA manifest**(P5) — 별도 작업. 아이콘/이름/디스플레이 모드.

payload에는 상대방 식별 정보가 절대 들어가지 않는다(§9, 호스트 구독 기각 원칙 연장). 프론트도 이를 전제로 표시 문구를 짠다.

## 검증

- `npm run typecheck` / `lint` / `build` 모두 통과. push 3종 라우트 정상 빌드.

## 배포 전 설정 (R39와 동일, 재확인)

- `CRON_SECRET`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`를 Vercel에 설정.
- VAPID 키 생성: `npx web-push generate-vapid-keys`
- 이게 없으면: cron은 401 거부, dispatch는 큐만 쌓고 발송 안 함, `/api/push/config`는 enabled=false.

## 백엔드 관점 남은 것 (선택)

- **`subscription_match` 알림** — 상황 템플릿 구독(subscriptions 테이블) 매칭 로직. 카드 생성 시 매칭되는 구독자에게 알림 생성. (P5, 재방문 가설용)
- **`report_status_change` 알림** — 신고 상태 변경(admin resolve) 시 신고자에게 알림 생성 연결.
- **`card_deadline_imminent` 알림** — 마감 임박 카드의 관심 유저 알림. 생성 트리거 미연결.

위 3개는 알림 "생성" 트리거만 붙이면 되고, 발송 파이프라인(dispatch)은 이미 완성돼 그대로 태우면 된다.

## 프론트 담당(코덱스) 큰 덩어리

- 서비스워커 + 푸시 구독 UI (위 계약대로)
- PWA manifest
- messages Realtime 구독 (Supabase Realtime)
- 신고 버튼 sticky 배치
- feed pull-to-refresh
