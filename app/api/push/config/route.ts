import { NextResponse } from "next/server";
import { hasVapidEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * 프론트가 Web Push 구독을 만들 때 필요한 VAPID public key와
 * 푸시 사용 가능 여부를 내려준다.
 *
 * public key는 원래 공개되는 값(NEXT_PUBLIC_*)이므로 노출에 문제없다.
 * VAPID가 설정되지 않은 환경에서는 enabled=false로 내려, 프론트가
 * 구독 UI를 숨길 수 있게 한다.
 */
export function GET() {
  const enabled = hasVapidEnv();

  return NextResponse.json({
    data: {
      enabled,
      vapidPublicKey: enabled ? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null : null
    },
    error: null
  });
}
