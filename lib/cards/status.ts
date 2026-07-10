export type CardStatus = "open" | "pending_review" | "closed" | "rejected" | "cancelled";

export type ApplicationStatus = "pending" | "approved" | "rejected_closed";

const CARD_STATUS_LABELS: Record<string, string> = {
  open: "모집 중",
  pending_review: "검수 중",
  closed: "마감",
  rejected: "반려",
  cancelled: "취소"
};

const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  approved: "승인",
  rejected_closed: "마감",
  pending: "대기"
};

export function formatCardStatus(status: string) {
  return CARD_STATUS_LABELS[status] ?? "취소";
}

export function formatApplicationStatus(status: ApplicationStatus | undefined) {
  return APPLICATION_STATUS_LABELS[status ?? "pending"];
}
