import "server-only";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getVapidEnv, hasVapidEnv } from "@/lib/env";

type PendingNotification = {
  id: string;
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
  attempts: number;
  last_attempt_at: string | null;
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
};

export type DispatchSummary = {
  processed: number;
  sent: number;
  failed: number;
  retried: number;
  skippedNoSubscription: number;
  deadSubscriptionsRemoved: number;
};

// 실패 후 재시도까지의 최소 대기(§9: 5분 후 1회만 재시도)
const RETRY_DELAY_MS = 5 * 60 * 1000;
// 한 번의 cron 실행에서 처리할 최대 알림 수(런타임 타임아웃 방어)
const BATCH_SIZE = 100;

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) {
    return;
  }
  const env = getVapidEnv();
  // subject는 mailto: 또는 https URL이어야 한다(웹푸시 프로토콜 요구사항).
  webpush.setVapidDetails(
    "mailto:ops@mate.app",
    env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );
  vapidConfigured = true;
}

/**
 * pending 알림을 push_subscriptions로 발송한다(Mate_Backend_Spec.md §9).
 *
 * - 성공: status='sent'
 * - 실패 1회차: attempts=1로 두고 status는 pending 유지(5분 후 재시도 대상)
 * - 실패 2회차: status='failed' 확정
 * - 죽은 구독(410/404): push_subscriptions에서 즉시 삭제
 * - 구독이 하나도 없는 유저: status='failed'(보낼 곳이 없음)
 */
export async function dispatchPendingNotifications(
  admin: SupabaseClient
): Promise<DispatchSummary> {
  const summary: DispatchSummary = {
    processed: 0,
    sent: 0,
    failed: 0,
    retried: 0,
    skippedNoSubscription: 0,
    deadSubscriptionsRemoved: 0
  };

  if (!hasVapidEnv()) {
    // VAPID 키가 없으면 발송 자체가 불가능. 큐를 건드리지 않고 그대로 둔다.
    return summary;
  }

  ensureVapidConfigured();

  const { data: pending } = await admin
    .from("notifications")
    .select("id, user_id, type, payload, attempts, last_attempt_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE)
    .returns<PendingNotification[]>();

  if (!pending || pending.length === 0) {
    return summary;
  }

  const now = Date.now();

  for (const notification of pending) {
    // 재시도 대기: 이전 시도가 있고 5분이 안 지났으면 이번 주기에는 건너뛴다.
    if (
      notification.attempts > 0 &&
      notification.last_attempt_at &&
      now - new Date(notification.last_attempt_at).getTime() < RETRY_DELAY_MS
    ) {
      continue;
    }

    summary.processed += 1;

    const { data: subscriptions } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth_key")
      .eq("user_id", notification.user_id)
      .returns<PushSubscriptionRow[]>();

    if (!subscriptions || subscriptions.length === 0) {
      summary.skippedNoSubscription += 1;
      await markFailed(admin, notification.id, notification.attempts);
      summary.failed += 1;
      continue;
    }

    const body = JSON.stringify({
      type: notification.type,
      payload: notification.payload
    });

    let anySuccess = false;

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth_key }
          },
          body
        );
        anySuccess = true;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        // 410 Gone / 404 Not Found → 죽은 구독. 즉시 삭제(§9).
        if (statusCode === 410 || statusCode === 404) {
          await admin.from("push_subscriptions").delete().eq("id", subscription.id);
          summary.deadSubscriptionsRemoved += 1;
        }
        // 그 외 오류는 아래 재시도/실패 처리로 이어진다.
      }
    }

    if (anySuccess) {
      await admin
        .from("notifications")
        .update({
          status: "sent",
          attempts: notification.attempts + 1,
          last_attempt_at: new Date().toISOString()
        })
        .eq("id", notification.id);
      summary.sent += 1;
    } else if (notification.attempts === 0) {
      // 1회차 실패 → pending 유지, 5분 후 재시도 대상
      await admin
        .from("notifications")
        .update({
          attempts: 1,
          last_attempt_at: new Date().toISOString()
        })
        .eq("id", notification.id);
      summary.retried += 1;
    } else {
      // 2회차 이상 실패 → failed 확정
      await markFailed(admin, notification.id, notification.attempts);
      summary.failed += 1;
    }
  }

  return summary;
}

async function markFailed(admin: SupabaseClient, id: string, attempts: number) {
  await admin
    .from("notifications")
    .update({
      status: "failed",
      attempts: attempts + 1,
      last_attempt_at: new Date().toISOString()
    })
    .eq("id", id);
}
