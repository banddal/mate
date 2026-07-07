# Mate Codex Handoff R44

> Date: 2026-07-07
> Round: 44
> Author: Codex
> Theme: Alerts 화면 + Web Push 프론트 연결

## 이번 라운드에서 한 일

- `/alerts` 화면을 추가했다.
  - 상황 템플릿 구독 목록 조회
  - 장소 입력
  - 시간 패턴 입력
  - 카테고리 선택
  - 구독 생성
  - 구독 삭제
  - 사람 구독 옵션 없음
- Web Push 구독 UI를 `/alerts`에 연결했다.
  - `GET /api/push/config`로 VAPID 사용 가능 여부 확인
  - `/sw.js` 서비스워커 등록
  - `Notification.requestPermission()`
  - `pushManager.subscribe()`
  - `POST /api/push/subscribe`
  - `POST /api/push/unsubscribe`
- PWA 기본 파일을 추가했다.
  - `public/sw.js`
  - `public/manifest.webmanifest`
  - `public/icon.svg`
- `app/layout.tsx`에 manifest를 연결했다.
- 서비스워커에서 알림 type별 문구와 이동 경로를 분기했다.
  - `application_resolved`
  - `card_review_resolved`
  - `subscription_match`
  - `card_deadline_imminent`
  - `report_status_change`
- `Mate_Workplan.md`에 PWA/Push/Alerts 프론트 완료 상태를 반영했다.

## 확인 경로

- `https://mate-161company.vercel.app/dev-login?next=/alerts`

## 시연 포인트

1. `/alerts`에서 상황 템플릿을 추가한다.
2. 저장된 상황 목록에서 삭제 버튼을 누른다.
3. Vercel에 VAPID 키가 설정된 환경에서는 브라우저 푸시를 켠다.
4. 서버가 `subscription_match` 등 알림을 생성하면 `/sw.js`가 알림 type별 문구를 표시한다.

## 운영 전 확인

- Vercel 환경변수:
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`
  - `CRON_SECRET`
- HTTPS 환경에서만 브라우저 Push가 정상 동작한다.
- 로컬 Windows에서는 `npm run test`가 Vitest config 로딩 권한 문제로 실패한 적이 있다. `typecheck`와 `build`는 통과했다.

## 다음 추천 작업

- `/alerts` UI를 실제 사용성 기준으로 다듬기
- Feed에서 알림/구독 진입 CTA 보강
- Room 메시지 Realtime 구독
- 신고 버튼 sticky 배치
- 모바일 Playwright E2E 시작
