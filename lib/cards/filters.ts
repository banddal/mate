import { z } from "zod";

export const cardFeedFilterSchema = z.object({
  period: z.enum(["all", "today", "week", "deadline"]).default("all"),
  category: z.string().trim().max(40).optional()
});

export type CardFeedFilter = z.infer<typeof cardFeedFilterSchema>;

export function parseCardFeedFilters(searchParams: URLSearchParams | Record<string, string | string[] | undefined>) {
  const getValue = (key: string) => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key) ?? undefined;
    }

    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  return cardFeedFilterSchema.parse({
    period: getValue("period") ?? "all",
    category: getValue("category") || undefined
  });
}

export function getFeedDateWindow(period: CardFeedFilter["period"]) {
  const now = new Date();

  if (period === "today") {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { from: now, to: end };
  }

  if (period === "week") {
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    return { from: now, to: end };
  }

  if (period === "deadline") {
    const end = new Date(now);
    end.setHours(end.getHours() + 24);
    return { deadlineFrom: now, deadlineTo: end };
  }

  return {};
}
