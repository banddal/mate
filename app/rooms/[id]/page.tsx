import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, ClipboardCheck, LockKeyhole, MapPin, MessageCircle, ShieldAlert } from "lucide-react";
import { requireOnboarded } from "@/lib/auth/session";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { hasServiceEnv } from "@/lib/env";
import { DEMO_ROOM_ID, getDemoCardDetail, getDemoMessages, DEMO_CREATED_CARD_ID } from "@/lib/demo-data";
import { getRoomAccess } from "@/lib/rooms/access";
import { RoomMessagePanel } from "./RoomMessagePanel";
import { CloseRoomButton } from "./CloseRoomButton";
import { ReportRoomForm } from "./ReportRoomForm";
import { BottomNav } from "@/components/BottomNav";
import { BackLink } from "@/components/BackLink";

type RoomPageProps = {
  params: {
    id: string;
  };
};

type RoomView = {
  id: string;
  status: "active" | "closed";
  role: "host" | "participant";
  card: {
    id: string;
    title: string;
    location: string;
    event_datetime: string;
  };
};

export default async function RoomPage({ params }: RoomPageProps) {
  const { user } = await requireOnboarded();
  const room = await getRoom(params.id, user.id);

  if (!room) {
    notFound();
  }

  if (room.status === "closed") {
    redirect(`/rooms/${room.id}/review`);
  }

  const messages = await getMessages(room.id, user.id);

  return (
    <main className="min-h-dvh px-5 pb-[calc(96px+env(safe-area-inset-bottom))] pt-[calc(24px+env(safe-area-inset-top))]">
      <section className="mx-auto w-full max-w-md space-y-5">
        <BackLink label="내 활동으로 돌아가기" fallbackHref="/me" />

        <header className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-moss">Mate Room</p>
            <h1 className="text-3xl font-bold leading-tight tracking-normal text-ink">{room.card.title}</h1>
            <p className="text-sm leading-6 text-ink/60">
              확정 후 만남 전까지 필요한 내용만 조율하는 공간입니다.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <RoomStep active icon={<ClipboardCheck className="h-4 w-4" aria-hidden />} label="확정" />
            <RoomStep active icon={<MessageCircle className="h-4 w-4" aria-hidden />} label="조율" />
            <RoomStep icon={<ClipboardCheck className="h-4 w-4" aria-hidden />} label="후기" />
          </div>
        </header>

        <section className="space-y-3 rounded-lg border border-line bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-moss/10 px-3 py-1 text-xs font-semibold text-moss">
              <LockKeyhole className="h-3.5 w-3.5" aria-hidden />
              {room.role === "host" ? "호스트" : "확정 참여자"}
            </span>
            <Link href={`/cards/${room.card.id}`} className="text-xs font-semibold text-ink/55">
              카드 보기
            </Link>
          </div>
          <div className="grid gap-2 rounded-md bg-paper/70 px-3 py-3 text-sm leading-6 text-ink/72">
            <p className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-moss" aria-hidden />
              {formatDateTime(room.card.event_datetime)}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-moss" aria-hidden />
              {room.card.location}
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-md border border-line bg-white px-3 py-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-moss" aria-hidden />
            <p className="text-sm leading-6 text-ink/65">
              연락처 교환, 현금 사례, 외부 대화 유도는 아직 제한 대상입니다.
            </p>
          </div>
        </section>

        <RoomMessagePanel roomId={room.id} initialMessages={messages} />
        <CloseRoomButton roomId={room.id} />
        <ReportRoomForm roomId={room.id} />
      </section>
      <BottomNav active="me" />
    </main>
  );
}

function RoomStep({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-3 text-center shadow-soft ${active ? "border-moss bg-moss/10 text-moss" : "border-line bg-white text-ink/45"}`}>
      <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-white">{icon}</div>
      <p className="mt-1 text-xs font-semibold">{label}</p>
    </div>
  );
}

async function getRoom(roomId: string, userId: string): Promise<RoomView | null> {
  if (!hasServiceEnv() || roomId === DEMO_ROOM_ID) {
    const card = getDemoCardDetail(DEMO_CREATED_CARD_ID);

    if (!card) {
      return null;
    }

    return {
      id: DEMO_ROOM_ID,
      status: "active",
      role: "host",
      card: {
        id: card.id,
        title: card.title,
        location: card.location,
        event_datetime: card.event_datetime
      }
    };
  }

  const access = await getRoomAccess(roomId, userId);

  if (!access) {
    return null;
  }

  return {
    id: access.id,
    status: access.status,
    role: access.role,
    card: {
      id: access.card.id,
      title: access.card.title,
      location: access.card.location,
      event_datetime: access.card.event_datetime
    }
  };
}

async function getMessages(roomId: string, userId: string) {
  if (!hasServiceEnv() || roomId === DEMO_ROOM_ID) {
    return getDemoMessages();
  }

  const admin = createServiceRoleSupabaseClient();
  const { data: messages, error } = await admin
    .from("messages")
    .select("id, sender_id, body, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });

  if (error || !messages) {
    return [];
  }

  const senderIds = [...new Set(messages.map((message) => message.sender_id))];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, nickname")
    .in("id", senderIds);
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.nickname]));

  return messages.map((message) => ({
    id: message.id,
    sender_name: profileMap.get(message.sender_id) ?? "참여자",
    body: message.body,
    created_at: message.created_at,
    is_mine: message.sender_id === userId
  }));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
