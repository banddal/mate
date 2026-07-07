import { getFeedDateWindow, type CardFeedFilter } from "@/lib/cards/filters";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasPublicEnv } from "@/lib/env";
import { getDemoCardDetail, getDemoFeedCards } from "@/lib/demo-data";

export type FeedCard = {
  id: string;
  host_id?: string;
  title: string;
  category: string;
  level: "L1" | "L2" | "L3";
  event_datetime: string;
  location: string;
  capacity: number;
  host_offer: string;
  cost_info: string | null;
  description: string;
  deadline_at: string;
  status: "open";
  created_at: string;
};

export type CardDetail = FeedCard & {
  host_id: string;
  status: "open" | "pending_review" | "closed" | "cancelled" | "rejected";
};

export async function getOpenCards(filters: CardFeedFilter) {
  if (!hasPublicEnv()) {
    return getDemoFeedCards();
  }

  const supabase = createServerSupabaseClient();
  const window = getFeedDateWindow(filters.period);

  let query = supabase
    .from("cards")
    .select(
      "id, title, category, level, event_datetime, location, capacity, host_offer, cost_info, description, deadline_at, status, created_at"
    )
    .eq("status", "open")
    .order(filters.period === "deadline" ? "deadline_at" : "event_datetime", {
      ascending: true
    })
    .limit(50);

  if (filters.category) {
    query = query.eq("category", filters.category);
  }

  if ("from" in window && window.from) {
    query = query.gte("event_datetime", window.from.toISOString());
  }

  if ("to" in window && window.to) {
    query = query.lte("event_datetime", window.to.toISOString());
  }

  if ("deadlineFrom" in window && window.deadlineFrom) {
    query = query.gte("deadline_at", window.deadlineFrom.toISOString());
  }

  if ("deadlineTo" in window && window.deadlineTo) {
    query = query.lte("deadline_at", window.deadlineTo.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    return getDemoFeedCards();
  }

  return data && data.length > 0 ? (data as FeedCard[]) : getDemoFeedCards();
}

export async function getCardDetail(cardId: string) {
  const demoCard = getDemoCardDetail(cardId);

  if (demoCard) {
    return demoCard;
  }

  if (!hasPublicEnv()) {
    return null;
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("cards")
    .select(
      "id, host_id, title, category, level, event_datetime, location, capacity, host_offer, cost_info, description, deadline_at, status, created_at"
    )
    .eq("id", cardId)
    .maybeSingle<CardDetail>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}
