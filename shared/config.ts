// Mate V0.1 공유 상수 — FE/BE 공용.
// 값 변경은 반드시 PR을 거친다 (Mate_Backend_Spec.md §10 — DB 설정 테이블 대신 코드 상수를
// 쓰기로 한 이유: git 히스토리가 이미 완전한 감사 로그이고, PR 리뷰가 "몰래 임계치 낮추기"를
// DB row 수정보다 더 강하게 막는다).

export const APPLICATION_REASON_MAX_LENGTH = 100;

export const PHONE_OTP_EXPIRY_MINUTES = 5;
export const PHONE_OTP_MAX_ATTEMPTS = 5;
export const PHONE_OTP_RESEND_COOLDOWN_SECONDS = 60;

export const REPORT_SLA_HOURS = 24;
export const REPORT_SUSPENSION_DAYS = 7;

export const NOTIFICATION_DEDUP_WINDOW_HOURS = 24;

// 위 값 중 프론트가 폼 검증 힌트로 참조해야 하는 것만 공개 상수로 분리.
// GET /api/config는 이 객체를 그대로 JSON으로 반환한다(DB 조회 없음).
export const PUBLIC_CONFIG = {
  applicationReasonMaxLength: APPLICATION_REASON_MAX_LENGTH,
} as const;
