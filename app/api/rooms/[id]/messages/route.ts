import { fail, ok } from "@/lib/api/responses";
import { getCurrentUserAndProfile, isProfileComplete } from "@/lib/auth/session";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { hasServiceEnv } from "@/lib/env";
import { DEMO_ROOM_ID } from "@/lib/demo-data";
import { getRoomAccess } from "@/lib/rooms/access";
import { z } from "zod";

export const dynamic = "force-dynamic";

const messageSchema = z.object({
  body: z.string().trim().min(1, "메시지를 입력해주세요.").max(500, "메시지는 500자 이내로 입력해주세요.")
});

type MessagesRouteContext = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, { params }: MessagesRouteContext) {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    return fail({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, 401);
  }

  if (!isProfileComplete(profile)) {
    return fail({ code: "ONBOARDING_REQUIRED", message: "온보딩을 완료해주세요." }, 403);
  }

  const parsed = messageSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return fail(
      {
        code: "INVALID_MESSAGE",
        message: parsed.error.issues[0]?.message ?? "메시지를 확인해주세요."
      },
      400
    );
  }

  if (!hasServiceEnv() || params.id === DEMO_ROOM_ID) {
    return ok({
      message: {
        id: `demo-message-${Date.now()}`,
        sender_name: profile?.nickname ?? "Dev Mate",
        body: parsed.data.body,
        created_at: new Date().toISOString(),
        is_mine: true
      }
    });
  }

  const room = await getRoomAccess(params.id, user.id);

  if (!room) {
    return fail({ code: "ROOM_NOT_FOUND", message: "방을 찾지 못했어요." }, 404);
  }

  if (room.status !== "active") {
    return fail({ code: "ROOM_CLOSED", message: "종료된 방에는 메시지를 보낼 수 없어요." }, 400);
  }

  const admin = createServiceRoleSupabaseClient();
  const { data: message, error: insertError } = await admin
    .from("messages")
    .insert({
      room_id: room.id,
      sender_id: user.id,
      body: parsed.data.body
    })
    .select("id, body, created_at")
    .single();

  if (insertError || !message) {
    return fail({ code: "MESSAGE_CREATE_FAILED", message: "메시지를 저장하지 못했어요." }, 500);
  }

  return ok({
    message: {
      id: message.id,
      sender_name: profile?.nickname ?? "나",
      body: message.body,
      created_at: message.created_at,
      is_mine: true
    }
  });
}
