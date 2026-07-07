import "server-only";
import { getCronSecret } from "@/lib/env";

/**
 * 내부 cron 엔드포인트 호출 검증 (Mate_Backend_Spec.md §4).
 *
 * Vercel Cron은 요청에 `Authorization: Bearer <CRON_SECRET>` 헤더를 실어 보낸다.
 * CRON_SECRET이 설정되지 않은 환경(로컬 등)에서는 검증을 건너뛰지 않고 거부한다 —
 * 내부 엔드포인트는 공개 API가 아니므로, secret이 없으면 아무도 호출할 수 없어야 한다.
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = getCronSecret();

  if (!secret) {
    return false;
  }

  const header = request.headers.get("authorization");

  if (!header) {
    return false;
  }

  const expected = `Bearer ${secret}`;

  // 길이가 다르면 즉시 실패(타이밍 공격 방어는 secret 길이가 노출되는 수준이라
  // V0.1에서는 단순 비교로 충분 — 필요해지면 crypto.timingSafeEqual로 교체).
  return header === expected;
}
