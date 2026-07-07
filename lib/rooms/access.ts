import "server-only";

import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export type RoomAccess = {
  id: string;
  status: "active" | "closed";
  card: {
    id: string;
    host_id: string;
    title: string;
    location: string;
    event_datetime: string;
  };
  role: "host" | "participant";
};

export async function getRoomAccess(roomId: string, userId: string): Promise<RoomAccess | null> {
  const admin = createServiceRoleSupabaseClient();
  const { data: room, error: roomError } = await admin
    .from("rooms")
    .select("id, status, card_id")
    .eq("id", roomId)
    .maybeSingle<{
      id: string;
      status: "active" | "closed";
      card_id: string;
    }>();

  if (roomError || !room) {
    return null;
  }

  const { data: card } = await admin
    .from("cards")
    .select("id, host_id, title, location, event_datetime")
    .eq("id", room.card_id)
    .maybeSingle<{
      id: string;
      host_id: string;
      title: string;
      location: string;
      event_datetime: string;
    }>();

  if (!card) {
    return null;
  }

  if (card.host_id === userId) {
    return {
      id: room.id,
      status: room.status,
      card,
      role: "host"
    };
  }

  const { data: application } = await admin
    .from("applications")
    .select("id")
    .eq("card_id", card.id)
    .eq("applicant_id", userId)
    .eq("status", "approved")
    .maybeSingle<{ id: string }>();

  if (!application) {
    return null;
  }

  return {
    id: room.id,
    status: room.status,
    card,
    role: "participant"
  };
}
