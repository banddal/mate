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
  const demoCards = getFilteredDemoFeedCards(filters);

  if (!hasPublicEnv()) {
    return demoCards;
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
    return demoCards;
  }

  if (!data || data.length === 0) {
    return demoCards;
  }

  const realCards = data as FeedCard[];
  const realCardIds = new Set(realCards.map((card) => card.id));
  const fillerCards = demoCards.filter((card) => !realCardIds.has(card.id));

  return [...realCards, ...fillerCards].slice(0, 12);
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

function getFilteredDemoFeedCards(filters: CardFeedFilter) {
  const window = getFeedDateWindow(filters.period);

  return getDemoFeedCards().filter((card) => {
    const eventTime = new Date(card.event_datetime).getTime();
    const deadlineTime = new Date(card.deadline_at).getTime();

    if (filters.category && card.category !== filters.category) {
      return false;
    }

    if ("from" in window && window.from && eventTime < window.from.getTime()) {
      return false;
    }

    if ("to" in window && window.to && eventTime > window.to.getTime()) {
      return false;
    }

    if ("deadlineFrom" in window && window.deadlineFrom && deadlineTime < window.deadlineFrom.getTime()) {
      return false;
    }

    if ("deadlineTo" in window && window.deadlineTo && deadlineTime > window.deadlineTo.getTime()) {
      return false;
    }

    return true;
  });
}
