import { fail, ok } from "@/lib/api/responses";
import { getCurrentUserAndProfile, isProfileComplete } from "@/lib/auth/session";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { hasServiceEnv } from "@/lib/env";
import { DEMO_ROOM_ID } from "@/lib/demo-data";
import { getRoomAccess } from "@/lib/rooms/access";

export const dynamic = "force-dynamic";

type CloseRouteContext = {
  params: {
    id: string;
  };
};

export async function POST(_request: Request, { params }: CloseRouteContext) {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    return fail({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, 401);
  }

  if (!isProfileComplete(profile)) {
    return fail({ code: "ONBOARDING_REQUIRED", message: "온보딩을 완료해주세요." }, 403);
  }

  if (!hasServiceEnv() || params.id === DEMO_ROOM_ID) {
    return ok({
      room: {
        id: DEMO_ROOM_ID,
        status: "closed"
      },
      next: `/rooms/${DEMO_ROOM_ID}/review`
    });
  }

  const room = await getRoomAccess(params.id, user.id);

  if (!room) {
    return fail({ code: "ROOM_NOT_FOUND", message: "방을 찾지 못했어요." }, 404);
  }

  if (room.status !== "active") {
    return fail({ code: "ROOM_ALREADY_CLOSED", message: "이미 종료된 방입니다." }, 400);
  }

  const admin = createServiceRoleSupabaseClient();
  const { error: closeError } = await admin
    .from("rooms")
    .update({
      status: "closed",
      closed_at: new Date().toISOString()
    })
    .eq("id", room.id);

  if (closeError) {
    return fail({ code: "ROOM_CLOSE_FAILED", message: "방을 종료하지 못했어요." }, 500);
  }

  await admin.from("messages").delete().eq("room_id", room.id);

  return ok({
    room: {
      id: room.id,
      status: "closed"
    },
    next: `/rooms/${room.id}/review`
  });
}
