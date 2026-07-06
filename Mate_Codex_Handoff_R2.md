# Mate — 코덱스 핸드오프 (Round 2)

> Round 1(`Mate_Codex_Handoff_R1.md`)에 이어지는 증분입니다. 이번 라운드 백엔드 변경사항: L3 게이팅 수식 확정, 신고 상태 머신 확정, 호스트 롤콜(`attendance_records`) 도입.
> 상세 근거는 `Mate_Backend_Spec.md` §6·§7 참조.

---

## 이번 라운드에서 새로 생긴 것

1. **호스트 롤콜(출석 확인)** — 모임 종료 시 호스트가 참여자별 실제 출석 여부를 확인하는 필수 스텝. 참여자 자기신고(review.attended)만으로는 완료 이력에 반영되지 않음(파밍 방어).
2. **L3 자격 조건 확정** — 나이 실제 인증(`age_verified`) + 계정 3주 경과 + 호스트 확인된 완료 2건(서로 다른 호스트) + 진행 중 신고 없음 + trust_score ≥ 60.
3. **신고 상태 머신** — open → reviewing → resolved(dismissed/warned/suspended_temp/suspended_perm/escalated). `escalated`/`suspended_perm`은 되돌릴 수 없음.

---

## 프론트엔드 작업 (신규/변경)

| 화면 | 변경 내용 |
|---|---|
| `/rooms/[id]` 종료 플로우 | 호스트에게 **"참여자 출석 확인"** 스텝 추가 — `POST /api/rooms/:id/attendance`. 리뷰(참여자 후기)와는 별개 화면. 48h 내 미제출 시 리마인드 알림 |
| `/cards/new` (L3 카드 생성) | capacity 입력을 **3~6명**으로 제한(DB CHECK와 동일 범위를 클라이언트에서도 선반영해 즉각 피드백) |
| L3 카드 신청/개설 진입 시 | 자격 미달 시 `error.code=L3_NOT_ELIGIBLE`와 함께 세부 사유(나이 미인증/기간 부족/완료 이력 부족/신고 진행 중 등)를 받아 **구체적으로 안내** — "조건이 안 맞습니다"류 뭉뚱그린 메시지 금지 (사용자가 무엇을 하면 되는지 알아야 함) |
| 온보딩 또는 L3 진입 시점 | **실제 성인 인증**(통신사 PASS 등 KYC, `age_range` 자기신고와 다른 별도 절차) 유도 화면 필요 — 벤더는 운영 파트에서 확정 예정 |
| `/admin` 신고 큐 | 신고 상태(open/reviewing/resolved) + resolution 5종(dismissed/warned/suspended_temp/suspended_perm/escalated) 표시, `escalated`/`suspended_perm`은 UI에서도 되돌리기 버튼 노출 금지 |

---

## 운영(Ops) 작업 (신규/변경)

- **성인 인증 벤더 선정** — 통신사 PASS 인증 또는 NICE평가정보 등 실명/연령 확인 API. `age_range` 자기신고와는 별도 트랙이라 신규 계약 필요.
- **신고 처리 SLA 운영 프로세스** — `open→reviewing` 24h 이내 픽업 목표. 담당자 배정/알림 채널(Slack 등) 구성.
- **`escalated` 처리 런북** — 수사기관 협조가 필요한 경우의 내부 절차 문서화(누가 판단하고, 어떤 데이터를 어떻게 제공하는지). 법무 검토 필요할 수 있음 — 확인 요망.
- **`app_config` 값 운영** — trust_score 가중치, L3 임계치(현재 기본값: 완료 2건/3주/신뢰점수 60) 등을 초기엔 DB 직접 수정으로 운영, V0.2에서 admin UI화 고려.

---

## 절대 규칙 추가 (Round 2)

8. 호스트 롤콜은 **참여자에 대한 평가/점수가 아니라 사실 확인**(출석 여부)만 — UI에 매력·호감 관련 문구/입력 절대 추가 금지 (P5 원칙 연장)
9. `escalated`/`suspended_perm` 신고 건은 어떤 화면에서도 "재검토"·"되돌리기" 액션 노출 금지 (백엔드가 DB 트리거로도 막지만 UI에서 애초에 안 보이게)

---

## 다음 라운드 예고
- `app_config` 테이블 구조 확정 → 이 값에 의존하는 UI(자격 미달 안내 문구 등)가 하드코딩 숫자 대신 API 응답 기반으로 동작하도록
- 알림 발송(Web Push) 큐/재시도 정책 확정 → 프론트 알림 권한 요청 UX 설계 필요해질 예정
