import { fail, ok } from "@/lib/api/responses";
import { getCurrentUserAndProfile, isProfileComplete } from "@/lib/auth/session";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { hasServiceEnv } from "@/lib/env";
import { DEMO_CREATED_CARD_ID, DEMO_ROOM_ID } from "@/lib/demo-data";
import { createNotification } from "@/lib/notifications/create";
import { z } from "zod";

export const dynamic = "force-dynamic";

const approveSchema = z.object({
  applicationId: z.string().min(1)
});

type ApproveRouteContext = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, { params }: ApproveRouteContext) {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    return fail({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, 401);
  }

  if (!isProfileComplete(profile)) {
    return fail({ code: "ONBOARDING_REQUIRED", message: "온보딩을 완료해주세요." }, 403);
  }

  const parsed = approveSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return fail({ code: "INVALID_APPLICATION", message: "승인할 신청자를 확인해주세요." }, 400);
  }

  if (params.id === DEMO_CREATED_CARD_ID) {
    return ok({
      application: {
        id: parsed.data.applicationId,
        status: "approved"
      },
      room: {
        id: DEMO_ROOM_ID,
        status: "active"
      }
    });
  }

  if (!hasServiceEnv()) {
    return fail(
      {
        code: "SERVER_CONFIG_MISSING",
        message: "서버 환경변수 설정이 필요합니다."
      },
      500
    );
  }

  const admin = createServiceRoleSupabaseClient();
  const { data: card, error: cardError } = await admin
    .from("cards")
    .select("id, host_id, status, capacity")
    .eq("id", params.id)
    .maybeSingle<{
      id: string;
      host_id: string;
      status: string;
      capacity: number;
    }>();

  if (cardError) {
    return fail({ code: "CARD_LOOKUP_FAILED", message: "카드를 확인하지 못했어요." }, 500);
  }

  if (!card) {
    return fail({ code: "CARD_NOT_FOUND", message: "카드를 찾지 못했어요." }, 404);
  }

  if (card.host_id !== user.id) {
    return fail({ code: "HOST_ONLY", message: "호스트만 승인할 수 있어요." }, 403);
  }

  if (card.status !== "open") {
    return fail({ code: "CARD_NOT_OPEN", message: "이미 마감된 카드입니다." }, 400);
  }

  const { count: approvedCount, error: approvedCountError } = await admin
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("card_id", card.id)
    .eq("status", "approved");

  if (approvedCountError) {
    return fail({ code: "CAPACITY_CHECK_FAILED", message: "남은 자리를 확인하지 못했어요." }, 500);
  }

  if ((approvedCount ?? 0) >= card.capacity) {
    return fail({ code: "CAPACITY_FULL", message: "이미 정원이 찼어요." }, 400);
  }

  const { data: application, error: applicationError } = await admin
    .from("applications")
    .select("id, card_id, status, applicant_id")
    .eq("id", parsed.data.applicationId)
    .eq("card_id", card.id)
    .maybeSingle<{
      id: string;
      card_id: string;
      status: string;
      applicant_id: string;
    }>();

  if (applicationError) {
    return fail({ code: "APPLICATION_LOOKUP_FAILED", message: "신청을 확인하지 못했어요." }, 500);
  }

  if (!application || application.status !== "pending") {
    return fail({ code: "APPLICATION_NOT_PENDING", message: "승인할 수 없는 신청입니다." }, 400);
  }

  const { error: approveError } = await admin
    .from("applications")
    .update({ status: "approved" })
    .eq("id", application.id);

  if (approveError) {
    return fail({ code: "APPLICATION_APPROVE_FAILED", message: "신청을 승인하지 못했어요." }, 500);
  }

  const nextApprovedCount = (approvedCount ?? 0) + 1;
  const isCapacityFull = nextApprovedCount >= card.capacity;

  if (isCapacityFull) {
    const { error: rejectRestError } = await admin
      .from("applications")
      .update({ status: "rejected_closed" })
      .eq("card_id", card.id)
      .neq("id", application.id)
      .eq("status", "pending");

    if (rejectRestError) {
      return fail({ code: "APPLICATION_CLOSE_FAILED", message: "다른 신청을 마감하지 못했어요." }, 500);
    }

    const { error: closeCardError } = await admin
      .from("cards")
      .update({ status: "closed" })
      .eq("id", card.id);

    if (closeCardError) {
      return fail({ code: "CARD_CLOSE_FAILED", message: "카드를 마감하지 못했어요." }, 500);
    }
  }

  const { data: room, error: roomError } = await admin
    .from("rooms")
    .upsert(
      {
        card_id: card.id,
        status: "active",
        closed_at: null
      },
      { onConflict: "card_id" }
    )
    .select("id, status")
    .single();

  if (roomError || !room) {
    return fail({ code: "ROOM_CREATE_FAILED", message: "Mate Room을 만들지 못했어요." }, 500);
  }

  // 승인된 신청자에게 확정 알림(§9). 알림 실패가 승인을 되돌리지 않도록 예외를 삼킨다.
  try {
    await createNotification(admin, {
      userId: application.applicant_id,
      type: "application_resolved",
      cardId: card.id,
      payload: {
        cardId: card.id,
        roomId: room.id,
        outcome: "approved"
      }
    });
  } catch {
    // 알림 생성 실패는 무시(승인 자체는 성공). dispatch/모니터링에서 별도로 다룬다.
  }

  return ok({
    application: {
      id: application.id,
      status: "approved"
    },
    room,
    capacity: {
      approved: nextApprovedCount,
      total: card.capacity,
      remaining: Math.max(card.capacity - nextApprovedCount, 0),
      closed: isCapacityFull
    }
  });
}
